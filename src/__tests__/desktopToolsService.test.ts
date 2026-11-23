import { describe, it, expect } from 'vitest';
import {
  DesktopListeningPort,
  DesktopProcessInfo,
  HardwareSpecs,
  buildWolMagicPacket,
  calculateUsagePercent,
  clampAutoClickerInterval,
  estimateActionsPerSecond,
  filterAndSortProcesses,
  filterListeningPorts,
  formatCpuFrequency,
  formatDurationSeconds,
  formatHardwareSpecsSummary,
  formatUptimeDuration,
  formatVram,
  getDesktopHardwareSpecs,
  getDesktopSystemTelemetry,
  isValidIpv4Address,
  isValidMacAddress,
  isValidNetworkHost,
  listDesktopPorts,
  normalizeMacAddress,
  parsePortList,
  runDesktopPing,
  startDesktopKeepAwake,
} from '../services/desktopToolsService';

describe('desktopToolsService pure helpers', () => {
  it('validates network hostnames and rejects shell injection characters', () => {
    expect(isValidNetworkHost('1.1.1.1')).toBe(true);
    expect(isValidNetworkHost('github.com')).toBe(true);
    expect(isValidNetworkHost('::1')).toBe(true);
    expect(isValidNetworkHost('my-nas.local')).toBe(true);

    expect(isValidNetworkHost('')).toBe(false);
    expect(isValidNetworkHost('-c 1 127.0.0.1')).toBe(false);
    expect(isValidNetworkHost('127.0.0.1; rm -rf /')).toBe(false);
    expect(isValidNetworkHost('example.com && whoami')).toBe(false);
  });

  it('validates IPv4 addresses', () => {
    expect(isValidIpv4Address('255.255.255.255')).toBe(true);
    expect(isValidIpv4Address('192.168.1.255')).toBe(true);
    expect(isValidIpv4Address('0.0.0.0')).toBe(true);

    expect(isValidIpv4Address('256.0.0.1')).toBe(false);
    expect(isValidIpv4Address('192.168.1')).toBe(false);
    expect(isValidIpv4Address('abc.def.0.1')).toBe(false);
  });

  it('validates, normalizes MAC addresses and builds 102-byte WoL magic packets', () => {
    expect(isValidMacAddress('aa:bb:cc:dd:ee:ff')).toBe(true);
    expect(isValidMacAddress('AA-BB-CC-DD-EE-FF')).toBe(true);
    expect(isValidMacAddress('AABBCCDDEEFF')).toBe(true);
    expect(isValidMacAddress('GG:BB:CC:DD:EE:FF')).toBe(false);
    expect(isValidMacAddress('AA:BB:CC')).toBe(false);

    expect(normalizeMacAddress('aa-bb-cc-dd-ee-ff')).toBe('AA:BB:CC:DD:EE:FF');
    expect(normalizeMacAddress('invalid')).toBeNull();

    const packet = buildWolMagicPacket('01:23:45:67:89:AB');
    expect(packet).not.toBeNull();
    expect(packet?.length).toBe(102);
    // First 6 bytes must be 0xFF
    expect(Array.from(packet!.slice(0, 6))).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    // 16 repetitions of the 6-byte MAC
    for (let i = 0; i < 16; i++) {
      expect(Array.from(packet!.slice(6 + i * 6, 12 + i * 6))).toEqual([
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab,
      ]);
    }
    expect(buildWolMagicPacket('bad')).toBeNull();
  });

  it('parses port lists and ranges with deduplication and max cap', () => {
    expect(parsePortList('80, 443, 3000-3002, 80')).toEqual([80, 443, 3000, 3001, 3002]);
    expect(parsePortList('0, 70000, abc, 22')).toEqual([22]);
    expect(parsePortList('1-100', 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('clamps auto-clicker intervals, estimates CPS, and formats duration seconds', () => {
    expect(clampAutoClickerInterval(1)).toBe(10);
    expect(clampAutoClickerInterval(250)).toBe(250);
    expect(clampAutoClickerInterval(Number.NaN)).toBe(100);

    expect(estimateActionsPerSecond(100)).toBe(10);
    expect(estimateActionsPerSecond(50)).toBe(20);
    expect(estimateActionsPerSecond(1)).toBe(100);

    expect(formatDurationSeconds(0)).toBe('00:00');
    expect(formatDurationSeconds(75)).toBe('01:15');
    expect(formatDurationSeconds(3661)).toBe('01:01:01');
  });

  it('filters and sorts desktop processes and listening ports', () => {
    const procs: DesktopProcessInfo[] = [
      { pid: 100, name: 'node', cpu_usage: 12.5, memory_mb: 240, status: 'Run', cmd: 'node server.ts' },
      { pid: 200, name: 'chrome', cpu_usage: 4.2, memory_mb: 980, status: 'Run', cmd: 'chrome --headless' },
      { pid: 50, name: 'postgres', cpu_usage: 1.0, memory_mb: 120, status: 'Sleep', cmd: 'postgres -D data' },
    ];

    const byRam = filterAndSortProcesses(procs, '', 'memory_mb', 'desc');
    expect(byRam.map(p => p.pid)).toEqual([200, 100, 50]);

    const byName = filterAndSortProcesses(procs, '', 'name', 'asc');
    expect(byName.map(p => p.name)).toEqual(['chrome', 'node', 'postgres']);

    const searchServer = filterAndSortProcesses(procs, 'server.ts', 'pid', 'asc');
    expect(searchServer.map(p => p.pid)).toEqual([100]);

    const ports: DesktopListeningPort[] = [
      { protocol: 'TCP', local_address: '127.0.0.1', port: 3000, state: 'LISTEN', pid: 100, process_name: 'node' },
      { protocol: 'UDP', local_address: '0.0.0.0', port: 5353, state: 'LISTEN', pid: 300, process_name: 'mDNS' },
    ];

    expect(filterListeningPorts(ports, '', 'TCP').map(p => p.port)).toEqual([3000]);
    expect(filterListeningPorts(ports, '3000', 'ALL').length).toBe(1);
    expect(filterListeningPorts(ports, 'mdns', 'UDP').length).toBe(1);
  });

  it('formats PC hardware specs, VRAM, CPU frequency, usage percentages, and uptime accurately', () => {
    expect(calculateUsagePercent(16, 32)).toBe(50);
    expect(calculateUsagePercent(5, 0)).toBe(0);
    expect(calculateUsagePercent(120, 100)).toBe(100);

    expect(formatVram(null)).toBe('N/A');
    expect(formatVram(512)).toBe('512 MB');
    expect(formatVram(8192)).toBe('8 GB');
    expect(formatVram(12288)).toBe('12 GB');
    expect(formatVram(6144)).toBe('6 GB');

    expect(formatCpuFrequency(0)).toBe('—');
    expect(formatCpuFrequency(800)).toBe('800 MHz');
    expect(formatCpuFrequency(4250)).toBe('4.25 GHz');

    expect(formatUptimeDuration(95)).toBe('1m 35s');
    expect(formatUptimeDuration(3665)).toBe('1h 1m 5s');
    expect(formatUptimeDuration(90061)).toBe('1d 1h 1m');

    const sampleSpecs: HardwareSpecs = {
      cpu_brand: 'AMD Ryzen 9 7950X 16-Core Processor',
      cpu_vendor: 'AuthenticAMD',
      cpu_arch: 'x86_64',
      physical_cores: 16,
      logical_cores: 32,
      base_freq_mhz: 4500,
      ram_total_gb: 64,
      ram_summary: '2x 32 GB DDR5 @ 6000 MHz',
      swap_total_gb: 8,
      gpus: [
        {
          name: 'NVIDIA GeForce RTX 4080',
          vendor: 'NVIDIA',
          vram_mb: 16384,
          driver_version: '566.14',
        },
      ],
      display_resolution: '2560x1440 @ 165 Hz',
      motherboard: 'ASUS ROG STRIX X670E-E',
      system_model: 'Custom Desktop',
      os_name: 'Windows 11 Pro',
      os_version: '23H2',
      kernel_version: '22631',
      hostname: 'WORKSTATION',
      disks: [
        {
          name: 'NVMe OS',
          mount_point: 'C:\\',
          file_system: 'NTFS',
          kind: 'SSD',
          used_gb: 420.5,
          total_gb: 1000,
          available_gb: 579.5,
          is_removable: false,
        },
      ],
    };

    const summary = formatHardwareSpecsSummary(sampleSpecs);
    expect(summary).toContain('AMD Ryzen 9 7950X');
    expect(summary).toContain('NVIDIA GeForce RTX 4080 (16 GB VRAM)');
    expect(summary).toContain('64.0 GB (2x 32 GB DDR5 @ 6000 MHz)');
    expect(summary).toContain('ASUS ROG STRIX X670E-E');
    expect(summary).toContain('C:\\ (SSD, NTFS)');
  });

  it('rejects native IPC wrappers cleanly when running outside Tauri', async () => {
    await expect(listDesktopPorts()).rejects.toThrow(/OmniDesk Desktop/);
    await expect(runDesktopPing('1.1.1.1')).rejects.toThrow(/OmniDesk Desktop/);
    await expect(getDesktopSystemTelemetry()).rejects.toThrow(/OmniDesk Desktop/);
    await expect(getDesktopHardwareSpecs()).rejects.toThrow(/OmniDesk Desktop/);
    await expect(
      startDesktopKeepAwake({
        keep_display: true,
        jiggle_mouse: false,
        jiggle_interval_sec: 45,
        duration_minutes: 0,
      })
    ).rejects.toThrow(/OmniDesk Desktop/);
  });
});
