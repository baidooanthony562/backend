const COMMON_PASSWORDS = new Set([
  'password','password1','password123','password!','pass1234','passw0rd','p@ssword','pa$$word','p@$$word',
  '123456','1234567','12345678','123456789','1234567890','12345','123123','111111','000000','121212','654321',
  'qwerty','qwerty123','qwertyuiop','asdfghjkl','zxcvbnm','1q2w3e4r','zaq1zaq1','qazwsx',
  'abc123','admin','admin123','login','welcome','letmein','trustno1','monkey','dragon',
  'master','shadow','superman','batman','iloveyou','sunshine','princess','football',
  'baseball','soccer','michael','jessica','starwars','hello123','changeme','secret',
]);

const SEQUENCES = [
  '0123','1234','2345','3456','4567','5678','6789',
  'abcd','bcde','cdef','defg','efgh','fghi','ghij','hijk','ijkl','jklm','klmn',
  'lmno','mnop','nopq','opqr','pqrs','qrst','rstu','stuv','tuvw','uvwx','vwxy','wxyz',
  'qwer','wert','erty','rtyu','tyui','yuio','uiop','asdf','sdfg','dfgh','fghj',
  'ghjk','hjkl','zxcv','xcvb','cvbn','vbnm',
];

function validatePassword(password, userInfo = {}) {
  const pwd = String(password);
  const lower = pwd.toLowerCase();
  const errors = [];

  if (pwd.length < 8)                             errors.push('at least 8 characters');
  if (!/[A-Z]/.test(pwd))                         errors.push('at least one uppercase letter');
  if (!/[a-z]/.test(pwd))                         errors.push('at least one lowercase letter');
  if (!/\d/.test(pwd))                            errors.push('at least one number');
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?|`~]/.test(pwd))
                                                   errors.push('at least one special character (!@#$% etc.)');
  if (COMMON_PASSWORDS.has(lower))                errors.push('not be a commonly used password');
  if (/(.)\1{2,}/.test(pwd))                      errors.push('not contain 3+ repeated characters (e.g. aaa, 111)');
  if (SEQUENCES.some((s) => lower.includes(s)))   errors.push('not contain sequential characters (e.g. 1234, qwerty)');

  const { name, email } = userInfo;
  if (name) {
    const parts = String(name).toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    if (parts.some((p) => lower.includes(p)))     errors.push('not contain your name');
  }
  if (email) {
    const user = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (user.length >= 3 && lower.replace(/[^a-z0-9]/g, '').includes(user))
                                                   errors.push('not contain your email');
  }

  return errors; // empty array = valid
}

module.exports = { validatePassword };
