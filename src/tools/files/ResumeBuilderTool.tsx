import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Download,
  FileText,
  GraduationCap,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { loadToolJson, saveToolJson } from '../../services/idbStorage';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { printHtmlDocument } from '../../services/printService';

type ResumeTemplate = 'modern' | 'classic' | 'compact';

interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  highlights: string;
}

interface EducationItem {
  id: string;
  degree: string;
  school: string;
  period: string;
  details: string;
}

interface ResumeData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  skills: string;
  languages: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  template: ResumeTemplate;
}

const STORAGE_KEY = 'omnidesk_resume_builder_v1';

const DEFAULT_RESUME: ResumeData = {
  fullName: 'Alex Novak',
  headline: 'Senior Full-Stack Engineer',
  email: 'alex.novak@example.com',
  phone: '+420 777 123 456',
  location: 'Prague, Czechia',
  website: 'github.com/alexnovak',
  summary:
    'Product-focused software engineer with 7+ years of experience building offline-first desktop and web applications in TypeScript, React, and Rust. Passionate about clean architecture, performance, and intuitive UX.',
  skills: 'TypeScript, React, Node.js, Rust, Tauri, PostgreSQL, Tailwind CSS, Docker, Git, Vitest',
  languages: 'English (Fluent), Czech (Native), German (Conversational)',
  experience: [
    {
      id: 'exp-1',
      role: 'Lead Frontend Engineer',
      company: 'Nordic Labs',
      period: '2022 – Present',
      highlights:
        'Architected a modular offline workstation serving 40k+ monthly active users.\nReduced cold startup latency by 48% through code splitting and Web Worker offloading.\nMentored 4 engineers and established automated E2E and unit testing standards.',
    },
    {
      id: 'exp-2',
      role: 'Software Engineer',
      company: 'Vertex Systems',
      period: '2019 – 2022',
      highlights:
        'Delivered real-time analytics dashboards and accessible component libraries.\nCollaborated closely with designers to achieve WCAG 2.1 AA compliance across 12 views.',
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'M.Sc. in Computer Science',
      school: 'Czech Technical University in Prague',
      period: '2017 – 2019',
      details: 'Focus on Software Engineering and Distributed Systems.',
    },
  ],
  template: 'modern',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}

function buildPrintableBodyHtml(data: ResumeData): string {
  const contactParts = [data.email, data.phone, data.location, data.website].filter(v => v.trim().length > 0);
  const skillTags = data.skills
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const expHtml = data.experience
    .map(exp => {
      const bullets = exp.highlights
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(line => `<li>${escapeHtml(line)}</li>`)
        .join('');
      return `
        <div class="item">
          <div class="item-head">
            <strong>${escapeHtml(exp.role)}</strong>
            <span class="period">${escapeHtml(exp.period)}</span>
          </div>
          <div class="sub">${escapeHtml(exp.company)}</div>
          ${bullets ? `<ul>${bullets}</ul>` : ''}
        </div>
      `;
    })
    .join('');

  const eduHtml = data.education
    .map(edu => `
      <div class="item">
        <div class="item-head">
          <strong>${escapeHtml(edu.degree)}</strong>
          <span class="period">${escapeHtml(edu.period)}</span>
        </div>
        <div class="sub">${escapeHtml(edu.school)}</div>
        ${edu.details.trim() ? `<p class="muted">${escapeHtml(edu.details)}</p>` : ''}
      </div>
    `)
    .join('');

  const templateClass = `tpl-${data.template}`;
  return `
    <div class="resume ${templateClass}">
      <header class="cv-header">
        <h1>${escapeHtml(data.fullName || 'Your Name')}</h1>
        ${data.headline.trim() ? `<div class="headline">${escapeHtml(data.headline)}</div>` : ''}
        <div class="contact">${contactParts.map(escapeHtml).join(' &bull; ')}</div>
      </header>
      ${
        data.summary.trim()
          ? `<section><h2>Summary</h2><p>${escapeHtml(data.summary)}</p></section>`
          : ''
      }
      <div class="cv-body">
        <div class="cv-main">
          ${data.experience.length > 0 ? `<section><h2>Experience</h2>${expHtml}</section>` : ''}
          ${data.education.length > 0 ? `<section><h2>Education</h2>${eduHtml}</section>` : ''}
        </div>
        <aside class="cv-side">
          ${
            skillTags.length > 0
              ? `<section><h2>Skills</h2><div class="skills">${skillTags
                  .map(s => `<span class="skill">${escapeHtml(s)}</span>`)
                  .join('')}</div></section>`
              : ''
          }
          ${
            data.languages.trim()
              ? `<section><h2>Languages</h2><p>${escapeHtml(data.languages)}</p></section>`
              : ''
          }
        </aside>
      </div>
    </div>
  `;
}

const RESUME_PRINT_CSS = `
  .resume { max-width: 780px; margin: 0 auto; color: #0f172a; font-size: 13px; line-height: 1.5; }
  .cv-header { padding-bottom: 12px; margin-bottom: 16px; border-bottom: 2px solid #4f46e5; }
  .tpl-classic .cv-header { border-bottom: 1px solid #0f172a; text-align: center; font-family: Georgia, serif; }
  .tpl-classic { font-family: Georgia, "Times New Roman", serif; }
  .resume h1 { margin: 0; font-size: 26px; border: 0; padding: 0; color: #0f172a; }
  .headline { font-size: 14px; font-weight: 600; color: #4f46e5; margin-top: 2px; }
  .tpl-classic .headline { color: #334155; }
  .contact { font-size: 12px; color: #475569; margin-top: 6px; }
  .resume h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin: 14px 0 8px; }
  .tpl-classic h2 { color: #0f172a; border-bottom-color: #94a3b8; }
  .item { margin-bottom: 10px; }
  .item-head { display: flex; justify-content: space-between; gap: 8px; }
  .period { color: #64748b; font-size: 12px; white-space: nowrap; }
  .sub { color: #334155; font-size: 12px; font-weight: 500; margin-bottom: 3px; }
  .resume ul { margin: 4px 0 0 18px; padding: 0; }
  .resume li { margin-bottom: 2px; }
  .skills { display: flex; flex-wrap: wrap; gap: 5px; }
  .skill { border: 1px solid #cbd5e1; background: #f8fafc; padding: 2px 7px; border-radius: 4px; font-size: 11px; }
  .muted { color: #475569; margin: 2px 0 0; font-size: 12px; }
  .tpl-compact .cv-body { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; }
`;

export const ResumeBuilderTool: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState<ResumeData>(DEFAULT_RESUME);
  const [loaded, setLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let active = true;
    loadToolJson<ResumeData>(STORAGE_KEY).then(saved => {
      if (!active) return;
      if (saved && typeof saved === 'object' && typeof saved.fullName === 'string') {
        setData({
          ...DEFAULT_RESUME,
          ...saved,
          experience: Array.isArray(saved.experience) ? saved.experience : DEFAULT_RESUME.experience,
          education: Array.isArray(saved.education) ? saved.education : DEFAULT_RESUME.education,
        });
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveToolJson(STORAGE_KEY, data).catch(() => {});
  }, [data, loaded]);

  const skillList = useMemo(
    () =>
      data.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    [data.skills]
  );

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(''), 2400);
  };

  const updateField = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const addExperience = () => {
    updateField('experience', [
      ...data.experience,
      {
        id: `exp-${Date.now()}`,
        role: '',
        company: '',
        period: '',
        highlights: '',
      },
    ]);
  };

  const updateExperience = (id: string, patch: Partial<ExperienceItem>) => {
    updateField(
      'experience',
      data.experience.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeExperience = (id: string) => {
    updateField(
      'experience',
      data.experience.filter(item => item.id !== id)
    );
  };

  const addEducation = () => {
    updateField('education', [
      ...data.education,
      {
        id: `edu-${Date.now()}`,
        degree: '',
        school: '',
        period: '',
        details: '',
      },
    ]);
  };

  const updateEducation = (id: string, patch: Partial<EducationItem>) => {
    updateField(
      'education',
      data.education.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeEducation = (id: string) => {
    updateField(
      'education',
      data.education.filter(item => item.id !== id)
    );
  };

  const handlePrintPdf = async () => {
    const bodyHtml = buildPrintableBodyHtml(data);
    await printHtmlDocument(bodyHtml, {
      title: `${data.fullName || 'Resume'} - CV`,
      extraCss: RESUME_PRINT_CSS,
    });
  };

  const handleExportHtml = async () => {
    const safeTitle = escapeHtml(`${data.fullName || 'Resume'} - CV`);
    const bodyHtml = buildPrintableBodyHtml(data);
    const fullDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 24px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    ${RESUME_PRINT_CSS}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
    const fileName = `${(data.fullName || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cv.html`;
    await saveTextWithDialog(
      fileName,
      fullDoc,
      [{ name: 'HTML (*.html)', extensions: ['html'] }],
      t('resume_export_html', 'Export Resume HTML')
    );
    flashStatus(t('resume_html_exported', 'Standalone HTML resume saved.'));
  };

  const handleExportJson = async () => {
    await saveTextWithDialog(
      'resume-backup.json',
      JSON.stringify(data, null, 2),
      [{ name: 'JSON (*.json)', extensions: ['json'] }],
      t('resume_export_json', 'Export Resume JSON')
    );
    flashStatus(t('resume_json_exported', 'Resume JSON exported.'));
  };

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (parsed && typeof parsed === 'object' && typeof (parsed as ResumeData).fullName === 'string') {
        const incoming = parsed as Partial<ResumeData>;
        setData({
          ...DEFAULT_RESUME,
          ...incoming,
          experience: Array.isArray(incoming.experience) ? incoming.experience : [],
          education: Array.isArray(incoming.education) ? incoming.education : [],
        });
        flashStatus(t('resume_json_imported', 'Resume imported.'));
      } else {
        flashStatus(t('resume_invalid_json', 'Invalid resume JSON file.'));
      }
    } catch {
      flashStatus(t('resume_invalid_json', 'Invalid resume JSON file.'));
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            {t('resume_builder_title', 'Offline Resume / CV Builder')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t(
              'resume_builder_desc',
              'Build ATS-friendly resumes privately on your device with live templates, print-to-PDF, and HTML/JSON export.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Resume template" className="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5">
            {(['modern', 'classic', 'compact'] as ResumeTemplate[]).map(tpl => (
              <button
                key={tpl}
                type="button"
                role="tab"
                aria-selected={data.template === tpl}
                onClick={() => updateField('template', tpl)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  data.template === tpl ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(`resume_tpl_${tpl}`, tpl)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            {t('resume_print_pdf', 'Print / PDF')}
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {t('export_html', 'Export HTML')}
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            {t('export_json', 'Export JSON')}
          </button>

          <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            {t('import_json', 'Import JSON')}
            <input type="file" accept=".json,application/json" className="sr-only" onChange={handleImportJson} />
          </label>

          {confirmReset ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setData(DEFAULT_RESUME);
                  setConfirmReset(false);
                  flashStatus(t('resume_reset_done', 'Reset to sample resume.'));
                }}
                className="px-2.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
              >
                {t('confirm_reset', 'Confirm Reset')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center gap-1"
              title={t('reset_sample', 'Reset to sample')}
              aria-label={t('reset_sample', 'Reset to sample')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="px-3 py-2 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 text-xs">
          {statusMsg}
        </div>
      )}

      {/* Split Editor & Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Form Editor */}
        <div className="xl:col-span-6 space-y-4">
          {/* Personal Info */}
          <section className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {t('resume_personal_section', 'Personal Details')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={data.fullName}
                onChange={e => updateField('fullName', e.target.value)}
                placeholder={t('resume_full_name', 'Full Name')}
                aria-label={t('resume_full_name', 'Full Name')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
              <input
                type="text"
                value={data.headline}
                onChange={e => updateField('headline', e.target.value)}
                placeholder={t('resume_headline', 'Job Title / Headline')}
                aria-label={t('resume_headline', 'Job Title / Headline')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
              <input
                type="email"
                value={data.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder={t('resume_email', 'Email')}
                aria-label={t('resume_email', 'Email')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
              <input
                type="text"
                value={data.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder={t('resume_phone', 'Phone')}
                aria-label={t('resume_phone', 'Phone')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
              <input
                type="text"
                value={data.location}
                onChange={e => updateField('location', e.target.value)}
                placeholder={t('resume_location', 'City, Country')}
                aria-label={t('resume_location', 'City, Country')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
              <input
                type="text"
                value={data.website}
                onChange={e => updateField('website', e.target.value)}
                placeholder={t('resume_website', 'Portfolio / GitHub / LinkedIn')}
                aria-label={t('resume_website', 'Portfolio / GitHub / LinkedIn')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
            </div>
            <textarea
              rows={3}
              value={data.summary}
              onChange={e => updateField('summary', e.target.value)}
              placeholder={t('resume_summary_placeholder', 'Concise professional summary...')}
              aria-label={t('resume_summary_heading', 'Summary')}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
            />
          </section>

          {/* Experience */}
          <section className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {t('resume_experience_section', 'Work Experience')}
              </h3>
              <button
                type="button"
                onClick={addExperience}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('resume_add_experience', 'Add Role')}
              </button>
            </div>
            <div className="space-y-3">
              {data.experience.map(exp => (
                <div key={exp.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={exp.role}
                      onChange={e => updateExperience(exp.id, { role: e.target.value })}
                      placeholder={t('resume_role', 'Role / Position')}
                      className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={exp.company}
                      onChange={e => updateExperience(exp.id, { company: e.target.value })}
                      placeholder={t('resume_company', 'Company')}
                      className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={exp.period}
                        onChange={e => updateExperience(exp.id, { period: e.target.value })}
                        placeholder={t('resume_period', '2022 – Present')}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
                        aria-label={t('delete', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={exp.highlights}
                    onChange={e => updateExperience(exp.id, { highlights: e.target.value })}
                    placeholder={t('resume_highlights_placeholder', 'One achievement per line...')}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Education */}
          <section className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                {t('resume_education_section', 'Education')}
              </h3>
              <button
                type="button"
                onClick={addEducation}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('resume_add_education', 'Add Education')}
              </button>
            </div>
            <div className="space-y-3">
              {data.education.map(edu => (
                <div key={edu.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={e => updateEducation(edu.id, { degree: e.target.value })}
                      placeholder={t('resume_degree', 'Degree / Program')}
                      className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={edu.school}
                      onChange={e => updateEducation(edu.id, { school: e.target.value })}
                      placeholder={t('resume_school', 'University / School')}
                      className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={edu.period}
                        onChange={e => updateEducation(edu.id, { period: e.target.value })}
                        placeholder={t('resume_period', '2017 – 2019')}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeEducation(edu.id)}
                        className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
                        aria-label={t('delete', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={edu.details}
                    onChange={e => updateEducation(edu.id, { details: e.target.value })}
                    placeholder={t('resume_edu_details', 'Thesis, honors, or focus area (optional)')}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Skills & Languages */}
          <section className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('resume_skills_label', 'Skills (comma-separated)')}
              </label>
              <input
                type="text"
                value={data.skills}
                onChange={e => updateField('skills', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('resume_languages_label', 'Languages')}
              </label>
              <input
                type="text"
                value={data.languages}
                onChange={e => updateField('languages', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
              />
            </div>
          </section>
        </div>

        {/* Live Paper Preview */}
        <div className="xl:col-span-6 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300">
              {t('resume_live_preview', 'Live A4 Document Preview')}
            </span>
            <span className="text-[11px] font-mono text-slate-400 uppercase">{data.template}</span>
          </div>

          <div
            className={`p-6 sm:p-8 rounded-lg bg-slate-950 border border-slate-700/80 space-y-4 text-slate-100 ${
              data.template === 'classic' ? 'font-serif' : 'font-sans'
            }`}
          >
            {/* Header */}
            <div
              className={`pb-3 ${
                data.template === 'classic'
                  ? 'border-b border-slate-600 text-center'
                  : 'border-b-2 border-indigo-500'
              }`}
            >
              <h1 className="text-2xl font-bold text-white">{data.fullName || t('resume_full_name', 'Full Name')}</h1>
              {data.headline && <p className="text-sm font-medium text-indigo-400 mt-0.5">{data.headline}</p>}
              <p className="text-xs text-slate-400 mt-1.5">
                {[data.email, data.phone, data.location, data.website].filter(Boolean).join(' • ')}
              </p>
            </div>

            {data.summary.trim() && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 mb-2">
                  {t('resume_summary_heading', 'Summary')}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">{data.summary}</p>
              </div>
            )}

            <div className={data.template === 'compact' ? 'grid grid-cols-1 md:grid-cols-3 gap-5' : 'space-y-4'}>
              <div className={data.template === 'compact' ? 'md:col-span-2 space-y-4' : 'space-y-4'}>
                {data.experience.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 mb-2">
                      {t('resume_experience_section', 'Work Experience')}
                    </h2>
                    <div className="space-y-3">
                      {data.experience.map(exp => (
                        <div key={exp.id} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-white">{exp.role || 'Role'}</span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">{exp.period}</span>
                          </div>
                          <div className="text-xs font-medium text-slate-300">{exp.company}</div>
                          {exp.highlights.trim() && (
                            <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                              {exp.highlights
                                .split('\n')
                                .map(l => l.trim())
                                .filter(Boolean)
                                .map((line, idx) => (
                                  <li key={idx}>{line}</li>
                                ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.education.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 mb-2">
                      {t('resume_education_section', 'Education')}
                    </h2>
                    <div className="space-y-2.5">
                      {data.education.map(edu => (
                        <div key={edu.id}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-white">{edu.degree || 'Degree'}</span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">{edu.period}</span>
                          </div>
                          <div className="text-xs text-slate-300">{edu.school}</div>
                          {edu.details.trim() && <p className="text-xs text-slate-400 mt-0.5">{edu.details}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {skillList.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 mb-2">
                      {t('resume_skills_heading', 'Skills')}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {skillList.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.languages.trim() && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 mb-2">
                      {t('resume_languages_label', 'Languages')}
                    </h2>
                    <p className="text-xs text-slate-300">{data.languages}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
