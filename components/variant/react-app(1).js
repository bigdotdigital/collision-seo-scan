import React, { useState, useEffect } from 'react';

const customStyles = {
  root: {
    '--bg-deep': '#0a0a0b',
    '--bg-surface': '#131416',
    '--glass-surface': 'rgba(30, 32, 36, 0.6)',
    '--glass-surface-active': 'rgba(40, 42, 46, 0.8)',
    '--accent-amber': '#FF9E2C',
    '--accent-amber-dim': 'rgba(255, 158, 44, 0.2)',
    '--accent-amber-glow': 'rgba(255, 158, 44, 0.4)',
    '--success': '#4CC972',
    '--danger': '#FF4B4B',
    '--text-primary': '#F0F0F0',
    '--text-secondary': '#8A8D94',
    '--text-tertiary': '#525459',
    '--radius-lg': '24px',
    '--radius-md': '12px',
    '--radius-sm': '6px',
    '--border-subtle': 'rgba(255, 255, 255, 0.08)',
    '--border-highlight': 'rgba(255, 255, 255, 0.15)',
    '--blur-strength': '20px',
  },
  body: {
    backgroundColor: '#0a0a0b',
    color: '#F0F0F0',
    overflowX: 'hidden',
    backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1c20 0%, transparent 50%), linear-gradient(to bottom, transparent, #0a0a0b 100%)',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    minHeight: '100vh',
  },
  h1: {
    fontSize: '3.5rem',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    marginBottom: '24px',
    color: '#F0F0F0',
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 400,
    letterSpacing: '-0.01em',
    marginBottom: '12px',
  },
  h3: {
    fontSize: '1.1rem',
    fontWeight: 500,
    color: '#F0F0F0',
  },
  p: {
    color: '#8A8D94',
    lineHeight: 1.6,
    fontSize: '1.05rem',
  },
  label: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#525459',
    fontWeight: 600,
  },
  mono: {
    fontFamily: "'SF Mono', 'Roboto Mono', monospace",
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 24px',
    height: '48px',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    background: '#FF9E2C',
    color: '#000',
    border: '1px solid #FF9E2C',
    boxShadow: '0 0 20px rgba(255, 158, 44, 0.2)',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 24px',
    height: '48px',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#F0F0F0',
    backdropFilter: 'blur(10px)',
  },
  scanConsole: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    height: '700px',
    margin: '48px auto',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    background: 'rgba(15, 16, 18, 0.8)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    position: 'relative',
  },
  viewport: {
    background: '#000',
    position: 'relative',
    overflow: 'hidden',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportContent: {
    width: '90%',
    height: '85%',
    background: '#1a1b1e',
    borderRadius: '8px',
    position: 'relative',
    overflow: 'hidden',
    transform: 'perspective(1000px) rotateX(1deg)',
    boxShadow: '0 0 30px rgba(0,0,0,0.5)',
  },
  skNav: {
    height: '40px',
    background: '#252629',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 15px',
    gap: '10px',
    position: 'relative',
  },
  skNavItem: {
    height: '8px',
    width: '40px',
    background: '#333',
    borderRadius: '2px',
  },
  skHero: {
    height: '200px',
    background: '#222326',
    margin: '15px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '30px',
    position: 'relative',
  },
  skLine: {
    height: '10px',
    background: '#333',
    marginBottom: '10px',
    borderRadius: '2px',
  },
  skBtn: {
    width: '120px',
    height: '36px',
    background: '#333',
    borderRadius: '4px',
    marginTop: '20px',
    border: '1px solid #444',
  },
  diagnosticsPanel: {
    background: 'rgba(19, 20, 22, 0.6)',
    backdropFilter: 'blur(20px)',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '15px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#FF9E2C',
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid transparent',
    transition: 'all 0.3s',
  },
  stepItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 158, 44, 0.2)',
    transition: 'all 0.3s',
    background: 'rgba(255, 158, 44, 0.05)',
  },
  stepIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid #525459',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: 'transparent',
    flexShrink: 0,
  },
  stepIconCompleted: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid #4CC972',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#4CC972',
    background: 'rgba(76, 201, 114, 0.1)',
    flexShrink: 0,
  },
  stepText: {
    fontSize: '0.95rem',
    color: '#8A8D94',
  },
  stepTextActive: {
    fontSize: '0.95rem',
    color: '#F0F0F0',
    fontWeight: 500,
  },
  resultsSection: {
    marginTop: '80px',
    paddingBottom: '80px',
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '24px',
  },
  scoreCard: {
    background: 'linear-gradient(145deg, rgba(30,32,36,0.6), rgba(20,21,23,0.8))',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    position: 'relative',
  },
  scoreRing: {
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    borderWidth: '8px',
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.05)',
    borderTopColor: '#FF9E2C',
    borderRightColor: '#FF9E2C',
    borderBottomColor: '#FF9E2C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    position: 'relative',
    transform: 'rotate(-45deg)',
  },
  scoreValue: {
    fontSize: '3.5rem',
    fontWeight: 600,
    color: '#F0F0F0',
    transform: 'rotate(45deg)',
  },
  scoreLabel: {
    fontSize: '0.9rem',
    color: '#8A8D94',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  reportCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  issueItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },
  priorityHigh: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginTop: '8px',
    flexShrink: 0,
    background: '#FF4B4B',
    boxShadow: '0 0 8px rgba(239, 83, 80, 0.4)',
  },
  priorityMed: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginTop: '8px',
    flexShrink: 0,
    background: '#FF9E2C',
  },
  issueH4: {
    fontSize: '0.95rem',
    fontWeight: 500,
    marginBottom: '4px',
    color: '#F0F0F0',
  },
  issueP: {
    fontSize: '0.85rem',
    color: '#8A8D94',
  },
  compTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  compTh: {
    textAlign: 'left',
    padding: '12px',
    color: '#525459',
    fontWeight: 500,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  compTd: {
    padding: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: '#8A8D94',
  },
  compTdFirst: {
    padding: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: '#F0F0F0',
    fontWeight: 500,
  },
  highlightBox: {
    position: 'absolute',
    border: '1px dashed #FF9E2C',
    background: 'rgba(255, 158, 44, 0.05)',
    borderRadius: '4px',
  },
};

const BgRings = () => (
  <div style={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.4,
  }}>
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '400px',
      height: '400px',
      border: '1px solid rgba(255, 158, 44, 0.1)',
      borderRadius: '50%',
    }} />
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '700px',
      height: '700px',
      border: '1px solid rgba(255, 158, 44, 0.05)',
      borderRadius: '50%',
    }} />
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '1100px',
      height: '1100px',
      border: '1px solid rgba(255, 158, 44, 0.03)',
      borderRadius: '50%',
    }} />
  </div>
);

const PulseDot = () => (
  <div style={{
    width: '8px',
    height: '8px',
    background: '#FF9E2C',
    borderRadius: '50%',
    boxShadow: '0 0 10px #FF9E2C',
    animation: 'pulse 1.5s infinite',
  }} />
);

const ScanLine = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '2px',
    background: '#FF9E2C',
    boxShadow: '0 0 15px #FF9E2C',
    animation: 'scan 3s infinite linear',
    zIndex: 5,
  }} />
);

const ScanOverlay = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to bottom, rgba(255, 158, 44, 0.05) 0%, transparent 20%)',
    animation: 'scan-overlay 3s infinite linear',
    pointerEvents: 'none',
  }} />
);

const StepIcon = ({ state }) => {
  if (state === 'completed') {
    return (
      <div style={customStyles.stepIconCompleted}>✓</div>
    );
  }
  if (state === 'active') {
    return (
      <div style={{
        ...customStyles.stepIcon,
        border: '1px solid #FF9E2C',
        borderTopColor: 'transparent',
        animation: 'spin 1s infinite linear',
        color: 'transparent',
      }} />
    );
  }
  return <div style={customStyles.stepIcon} />;
};

const steps = [
  { text: 'Capturing homepage architecture', state: 'completed' },
  { text: 'Checking mobile responsiveness', state: 'completed' },
  { text: 'Detecting trust signals & certifications', state: 'active' },
  { text: 'Evaluating CTA visibility contrast', state: 'pending' },
  { text: 'Comparing competitor positioning', state: 'pending' },
  { text: 'Calculating visibility score', state: 'pending' },
  { text: 'Building repair plan', state: 'pending' },
];

const ScanConsole = () => (
  <div style={customStyles.scanConsole}>
    <div style={{
      content: '',
      position: 'absolute',
      top: '20px',
      left: '20px',
      width: '20px',
      height: '20px',
      borderTop: '1px solid rgba(255, 158, 44, 0.5)',
      borderLeft: '1px solid rgba(255, 158, 44, 0.5)',
      pointerEvents: 'none',
      zIndex: 10,
    }} />
    <div style={{
      content: '',
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      width: '20px',
      height: '20px',
      borderBottom: '1px solid rgba(255, 158, 44, 0.5)',
      borderRight: '1px solid rgba(255, 158, 44, 0.5)',
      pointerEvents: 'none',
      zIndex: 10,
    }} />

    <div style={customStyles.viewport}>
      <ScanLine />
      <ScanOverlay />

      <div style={customStyles.viewportContent}>
        <div style={customStyles.skNav}>
          <div style={{ ...customStyles.skNavItem, width: '20px' }} />
          <div style={customStyles.skNavItem} />
          <div style={customStyles.skNavItem} />
          <div style={{ flexGrow: 1 }} />
          <div style={{ ...customStyles.skNavItem, background: '#FF9E2C', opacity: 0.8, width: '80px' }} />
          <div style={{
            ...customStyles.highlightBox,
            top: '10px',
            right: '10px',
            width: '90px',
            height: '30px',
            animation: 'blink 2s infinite',
          }} />
        </div>

        <div style={customStyles.skHero}>
          <div style={{ ...customStyles.skLine, width: '60%', height: '20px', marginBottom: '20px' }} />
          <div style={{ ...customStyles.skLine, width: '80%' }} />
          <div style={{ ...customStyles.skLine, width: '70%' }} />
          <div style={customStyles.skBtn} />
          <div style={{
            ...customStyles.highlightBox,
            top: '70px',
            left: '30px',
            width: '60%',
            height: '30px',
            animation: 'blink 2s infinite',
            animationDelay: '0.5s',
          }} />
        </div>

        <div style={{ display: 'flex', gap: '15px', padding: '0 15px' }}>
          <div style={{ flex: 1, height: '100px', background: '#222326', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '100px', background: '#222326', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '100px', background: '#222326', borderRadius: '4px' }} />
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
        color: '#FF9E2C',
        fontFamily: 'monospace',
      }}>
        SCANNING AXIS Y-01
      </div>
    </div>

    <div style={customStyles.diagnosticsPanel}>
      <div style={customStyles.panelHeader}>
        <h3 style={{ ...customStyles.h3, ...customStyles.mono }}>SYSTEM DIAGNOSTICS</h3>
        <div style={customStyles.statusIndicator}>
          <PulseDot />
          <span>Active Scan</span>
        </div>
      </div>

      <div style={customStyles.stepList}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={step.state === 'active' ? customStyles.stepItemActive : customStyles.stepItem}
          >
            <StepIcon state={step.state} />
            <div style={step.state === 'active' ? customStyles.stepTextActive : customStyles.stepText}>
              {step.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ScoreCard = () => (
  <div style={customStyles.scoreCard}>
    <div style={customStyles.scoreRing}>
      <span style={customStyles.scoreValue}>82</span>
    </div>
    <div style={customStyles.scoreLabel}>Visibility Score</div>
    <div style={{ ...customStyles.label, marginTop: '10px', color: '#4CC972' }}>Good Condition</div>
  </div>
);

const ReportGrid = () => (
  <div style={customStyles.reportGrid}>
    <div style={customStyles.reportCard}>
      <div style={customStyles.cardHeader}>
        <span style={customStyles.label}>Top Issues Impacting Calls</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <li style={customStyles.issueItem}>
          <div style={customStyles.priorityHigh} />
          <div>
            <h4 style={customStyles.issueH4}>Primary CTA below fold</h4>
            <p style={customStyles.issueP}>Estimate button not visible on mobile landing.</p>
          </div>
        </li>
        <li style={customStyles.issueItem}>
          <div style={customStyles.priorityHigh} />
          <div>
            <h4 style={customStyles.issueH4}>Slow load time (3.2s)</h4>
            <p style={customStyles.issueP}>High bounce rate potential on cellular networks.</p>
          </div>
        </li>
        <li style={customStyles.issueItem}>
          <div style={customStyles.priorityMed} />
          <div>
            <h4 style={customStyles.issueH4}>OEM Certifications hidden</h4>
            <p style={customStyles.issueP}>Trust signals buried in footer menu.</p>
          </div>
        </li>
      </ul>
    </div>

    <div style={customStyles.reportCard}>
      <div style={customStyles.cardHeader}>
        <span style={customStyles.label}>Local Market Context</span>
      </div>
      <table style={customStyles.compTable}>
        <thead>
          <tr>
            <th style={customStyles.compTh}>Shop Name</th>
            <th style={customStyles.compTh}>Score</th>
            <th style={customStyles.compTh}>Reviews</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customStyles.compTdFirst}>Your Shop</td>
            <td style={customStyles.compTd}>82</td>
            <td style={customStyles.compTd}>4.8 ★</td>
          </tr>
          <tr>
            <td style={customStyles.compTdFirst}>City Collision</td>
            <td style={customStyles.compTd}>74</td>
            <td style={customStyles.compTd}>4.2 ★</td>
          </tr>
          <tr>
            <td style={customStyles.compTdFirst}>AutoFix Pro</td>
            <td style={customStyles.compTd}>68</td>
            <td style={customStyles.compTd}>3.9 ★</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '20px' }}>
        <span style={customStyles.label}>Quick Fixes</span>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <span style={{
            fontSize: '0.85rem',
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#F0F0F0',
          }}>+ Add Sticky Header</span>
          <span style={{
            fontSize: '0.85rem',
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#F0F0F0',
          }}>+ Compress Images</span>
        </div>
      </div>
    </div>
  </div>
);

const App = () => {
  const [primaryHover, setPrimaryHover] = useState(false);
  const [secondaryHover, setSecondaryHover] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scan {
        0% { top: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
      @keyframes scan-overlay {
        0% { top: -20%; }
        100% { top: 100%; }
      }
      @keyframes pulse {
        0% { transform: scale(0.95); opacity: 0.7; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.95); opacity: 0.7; }
      }
      @keyframes blink {
        0% { opacity: 0.3; }
        50% { opacity: 1; }
        100% { opacity: 0.3; }
      }
      @keyframes spin {
        100% { transform: rotate(360deg); }
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      @media (max-width: 900px) {
        .scan-console-responsive {
          grid-template-columns: 1fr !important;
          height: auto !important;
        }
        .viewport-responsive {
          height: 300px !important;
          border-right: none !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .results-responsive {
          grid-template-columns: 1fr !important;
        }
        .report-grid-responsive {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={customStyles.body}>
      <BgRings />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <header style={{
          padding: '80px 0 48px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            maxWidth: '700px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 2,
          }}>
            <h1 style={customStyles.h1}>
              Scan your collision shop's online visibility.
            </h1>
            <p style={customStyles.p}>
              Find what's helping — and hurting — your estimate calls. A diagnostic tool for your business presence.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '24px',
            }}>
              <a
                href="#"
                style={{
                  ...customStyles.btnPrimary,
                  ...(primaryHover ? {
                    background: '#ffb052',
                    boxShadow: '0 0 30px rgba(255, 158, 44, 0.4)',
                  } : {}),
                }}
                onMouseEnter={() => setPrimaryHover(true)}
                onMouseLeave={() => setPrimaryHover(false)}
                onClick={(e) => e.preventDefault()}
              >
                Run Free Scan
              </a>
              <a
                href="#"
                style={{
                  ...customStyles.btnSecondary,
                  ...(secondaryHover ? {
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  } : {}),
                }}
                onMouseEnter={() => setSecondaryHover(true)}
                onMouseLeave={() => setSecondaryHover(false)}
                onClick={(e) => e.preventDefault()}
              >
                See Example Report
              </a>
            </div>
          </div>
        </header>

        <ScanConsole />

        <div style={customStyles.resultsSection}>
          <ScoreCard />
          <ReportGrid />
        </div>
      </div>
    </div>
  );
};

export default App;