import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  FileText,
  Lock,
  EyeOff,
  Server,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Terminal
} from 'lucide-react';

export const LegalView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'gdpr' | 'evidence' | 'crypto' | 'license'>('overview');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Legal & Regulatory Specification
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                v1.0.0 COMPLIANCE BLUEPRINT
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Data privacy under GDPR/CCPA, evidentiary chain of custody, cryptographic export controls, and MIT open-source terms.
          </p>
        </div>

        <a
          href="https://github.com/Meet-pandya106/resolveos/blob/main/docs/LEGAL_SPECIFICATION.md"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-panel text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors self-start sm:self-auto"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Raw Markdown</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl glass-panel border border-border/80">
        {[
          { id: 'overview', label: '1. Architecture & Classification', icon: Server },
          { id: 'gdpr', label: '2. GDPR / CCPA & Privacy', icon: ShieldCheck },
          { id: 'evidence', label: '3. Evidentiary Chain of Custody', icon: FileText },
          { id: 'crypto', label: '4. Cryptography & EAR Export', icon: Lock },
          { id: 'license', label: '5. MIT License & Disclaimers', icon: Scale }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Classification */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <span>1. Product Classification & Architectural Nature</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>ResolveOS</strong> is classified as an on-premises, local-first Problem Resolution Operating System.
              It is distributed under the MIT open-source software license as self-hosted software.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="text-xs font-bold text-foreground font-mono">Zero Host Control</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The authors and copyright holders maintain zero remote backdoors, zero administrative access, and zero telemetry collection.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="text-xs font-bold text-emerald-400 font-mono">Local Data Residence</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  All incident findings, heap dumps, 5-Whys trees, and verification metrics remain 100% on the customer’s private storage.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="text-xs font-bold text-primary font-mono">No Data Brokerage</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  ResolveOS authors do not act as data brokers or centralized custodians of customer operational intelligence.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GDPR & CCPA */}
      {activeTab === 'gdpr' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>2. Data Protection & Global Privacy Frameworks</span>
            </h2>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                When deployed within an enterprise, the deploying organization functions as the <strong>Data Controller</strong> (EU GDPR Art. 4(7) / Data Fiduciary under India DPDP 2023). ResolveOS operates locally without external data transmission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-foreground text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>GDPR Art. 5(1)(c) — Data Minimization</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Captures only email, scrypt-hashed password, and display name. Zero third-party trackers or marketing beacons.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-foreground text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>GDPR Art. 17 — Right to Erasure</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Irreversible account deletion endpoint invalidates sessions and anonymizes user identifiers permanently.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-foreground text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>GDPR Art. 20 — Data Portability</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  One-click export generates structured JSON and tabular CSV data dumps excluding sensitive cryptographic secrets.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-foreground text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CCPA / CPRA — Zero Sale of Data</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Zero commercial monetization of customer operational data, telemetry, or personal information.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Evidentiary Chain of Custody */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <span>3. Evidentiary Defensibility & Chain of Custody</span>
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed">
              ResolveOS incident records are designed to satisfy judicial and regulatory evidentiary requirements during post-incident litigation, cyber insurance claims, or SEC/FTC inquiries.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
                <div className="font-bold text-foreground">Federal Rules of Evidence 803(6) & 902(13)/(14)</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                  Records of Regularly Conducted Activity: Contemporaneously generated electronic records with UTC ISO 8601 timestamps, authenticated user bindings, and monotonic revision integers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
                <div className="font-bold text-foreground">ISO/IEC 27037:2012 Digital Evidence Standard</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                  Attaches APM logs, network dumps, and screenshots with cryptographic confidence ratings, retaining original file metadata without silent mutation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
                <div className="font-bold text-foreground">Enforced Resolution Invariant Defense</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                  Eliminates corporate liability from premature incident sign-off. Transition to RESOLVED status is physically blocked until an empirical test PASSED outcome is recorded.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Cryptography & Export */}
      {activeTab === 'crypto' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <span>4. Cryptography Inventory & EAR Export Classification</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-xs font-mono text-foreground">Password Hashing Engine</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Node-native <code>scrypt</code> (N=16384, r=8, p=1, 16-byte random salt, 64-byte key length). Constant-time <code>crypto.timingSafeEqual</code> prevents timing side-channels.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-xs font-mono text-foreground">Two-Factor Authentication</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  RFC 6238 Time-Based One-Time Password (TOTP) utilizing HMAC-SHA1 with time-drift window tolerance and encrypted single-use recovery codes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-xs font-mono text-foreground">API Secrets at Rest</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  SHA-256 hashed at rest; displayed exclusively via masked fingerprints (<code>ro_live_••••••••XXXX</code>).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-xs font-mono text-foreground">Export Regulations (EAR)</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Classified under ECCN 5D002 / 5D992.c (Mass Market Software / Publicly Available Software under EAR § 742.15(b)). Eligible for unrestricted open-source release under EAR § 734.3(b)(3).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: MIT License & Disclaimers */}
      {activeTab === 'license' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <span>5. Open-Source MIT License & Liability Disclaimers</span>
            </h2>

            <div className="p-4 rounded-2xl bg-background/90 border border-border/80 font-mono text-xs text-muted-foreground space-y-3 leading-relaxed">
              <div className="text-foreground font-bold">Copyright (c) 2026 ResolveOS Authors & Contributors</div>
              <p>
                Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software...
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-sans text-xs">
                <strong>DISCLAIMER OF WARRANTY & LIMITATION OF LIABILITY:</strong> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
