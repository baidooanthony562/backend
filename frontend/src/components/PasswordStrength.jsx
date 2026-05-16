const COMMON = new Set([
  'password','password1','password123','passw0rd','p@ssword','pa$$word',
  '123456','12345678','1234567890','123123','111111','000000','654321',
  'qwerty','qwerty123','abc123','admin','admin123','welcome','letmein',
  'monkey','dragon','master','shadow','iloveyou','sunshine','football',
  'baseball','hello123','changeme','secret','trustno1','superman','batman',
]);

const SEQS = [
  '0123','1234','2345','3456','4567','5678','6789',
  'abcd','bcde','cdef','defg','efgh','fghi','ghij','hijk','ijkl','jklm',
  'klmn','lmno','mnop','nopq','opqr','pqrs','qrst','rstu','stuv','tuvw',
  'uvwx','vwxy','wxyz','qwer','wert','erty','asdf','sdfg','zxcv','xcvb',
];

export function checkPassword(pwd, userInfo = {}) {
  const s = String(pwd);
  const low = s.toLowerCase();
  const { name = '', email = '' } = userInfo;

  const rules = [
    { id: 'len',     label: 'At least 8 characters',              ok: s.length >= 8 },
    { id: 'upper',   label: 'At least one uppercase letter',       ok: /[A-Z]/.test(s) },
    { id: 'lower',   label: 'At least one lowercase letter',       ok: /[a-z]/.test(s) },
    { id: 'num',     label: 'At least one number',                 ok: /\d/.test(s) },
    { id: 'special', label: 'At least one special character',      ok: /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?|`~]/.test(s) },
    { id: 'common',  label: 'Not a common password',               ok: !COMMON.has(low) },
    { id: 'repeat',  label: 'No 3+ repeated characters (aaa, 111)',ok: !(/(.)\1{2,}/.test(s)) },
    { id: 'seq',     label: 'No sequential characters (1234, qwerty)', ok: !SEQS.some((q) => low.includes(q)) },
    {
      id: 'name',
      label: 'Does not contain your name',
      ok: !name || !String(name).toLowerCase().split(/\s+/).filter((p) => p.length >= 3).some((p) => low.includes(p)),
    },
    {
      id: 'email',
      label: 'Does not contain your email',
      ok: (() => {
        const u = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        return u.length < 3 || !low.replace(/[^a-z0-9]/g, '').includes(u);
      })(),
    },
  ];

  const passed = rules.filter((r) => r.ok).length;
  const score = Math.round((passed / rules.length) * 100);
  const strength =
    passed <= 4 ? 'Weak' :
    passed <= 6 ? 'Fair' :
    passed <= 8 ? 'Good' : 'Strong';

  return { rules, passed, score, strength };
}

const COLORS = {
  Weak:   { bar: 'bg-red-500',    text: 'text-red-600' },
  Fair:   { bar: 'bg-amber-400',  text: 'text-amber-600' },
  Good:   { bar: 'bg-yellow-400', text: 'text-yellow-600' },
  Strong: { bar: 'bg-green-500',  text: 'text-green-600' },
};

export default function PasswordStrength({ password, userInfo = {} }) {
  if (!password) return null;
  const { rules, score, strength } = checkPassword(password, userInfo);
  const c = COLORS[strength];

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full transition-all duration-300 ${c.bar}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-xs font-bold ${c.text}`}>{strength}</span>
      </div>

      {/* Rule checklist — only show failing rules */}
      {rules.filter((r) => !r.ok).length > 0 && (
        <ul className="space-y-0.5">
          {rules.filter((r) => !r.ok).map((r) => (
            <li key={r.id} className="flex items-center gap-1.5 text-xs text-red-600">
              <span className="text-red-400">✗</span> {r.label}
            </li>
          ))}
        </ul>
      )}

      {strength === 'Strong' && (
        <p className="flex items-center gap-1 text-xs font-semibold text-green-600">
          <span>✓</span> Strong password
        </p>
      )}
    </div>
  );
}
