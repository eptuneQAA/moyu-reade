import { useEffect, useMemo, useRef, useState } from 'react';

const MODULES = [
  'src/app.tsx',
  'src/router.ts',
  'src/store.ts',
  'src/api/client.ts',
  'src/ui/theme.ts'
];

function makeLine(index: number, startedAt: number) {
  const time = new Date(startedAt + index * 850)
    .toTimeString()
    .slice(0, 8);
  const stage = index % 8;

  if (stage === 0) {
    return {
      kind: 'info',
      text: `[${time}] vite v6.3.5 building for production...`
    };
  }
  if (stage === 1) {
    return {
      kind: 'muted',
      text: `[${time}]   transforming ${40 + (index % 30)} modules...`
    };
  }
  if (stage === 2) {
    return {
      kind: 'muted',
      text: `[${time}]   ${MODULES[index % MODULES.length]}  ${120 + (index % 90)} bytes`
    };
  }
  if (stage === 3) {
    return {
      kind: 'warn',
      text: `[${time}] warning: unused variable 'tmp${index}' (eslint no-unused-vars)`
    };
  }
  if (stage === 4) {
    return {
      kind: 'ok',
      text: `[${time}]   module ${MODULES[index % MODULES.length]} compiled`
    };
  }
  if (stage === 5) {
    return {
      kind: 'muted',
      text: `[${time}] tsc --noEmit: checking ${(index % 9) + 1}/${(index % 9) + 9} files`
    };
  }
  if (stage === 6) {
    return {
      kind: 'info',
      text: `[${time}]   rendering chunks...`
    };
  }
  return {
    kind: 'ok',
    text: `[${time}] built in ${1100 + (index % 1700)}ms`
  };
}

export default function Disguise({ onHide }: { onHide: () => void }) {
  const startedAt = useMemo(() => Date.now() - 120000, []);
  const [count, setCount] = useState(42);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setCount((value) => value + 1), 700);
    return () => window.clearInterval(id);
  }, []);

  const lines = useMemo(
    () =>
      Array.from({ length: count }, (_, index) =>
        makeLine(index, startedAt)
      ).slice(-80),
    [count, startedAt]
  );

  useEffect(() => {
    const element = logRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lines.length]);

  return (
    <div className="disguise-screen" onClick={onHide}>
      <div className="disguise-top">
        <span className="traffic-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="disguise-tab">build</span>
        <span className="disguise-path">~/code/project</span>
      </div>
      <div className="disguise-log" ref={logRef}>
        {lines.map((line, index) => (
          <div key={index} className={`disguise-line ${line.kind}`}>
            {line.text}
          </div>
        ))}
        <div className="disguise-cursor">▌</div>
      </div>
    </div>
  );
}
