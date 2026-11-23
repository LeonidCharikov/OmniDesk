import { describe, it, expect } from 'vitest';
import {
  DesktopListeningPort,
  DesktopProcessInfo,
  buildWolMagicPacket,
  clampAutoClickerInterval,
  estimateActionsPerSecond,
  filterAndSortProcesses,
  filterListeningPorts,
  formatDurationSeconds,
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

  it('rejects native IPC wrappers cleanly when running outside Tauri', async () => {
    await expect(listDesktopPorts()).rejects.toThrow(/OmniDesk Desktop/);
    await expect(runDesktopPing('1.1.1.1')).rejects.toThrow(/OmniDesk Desktop/);
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
