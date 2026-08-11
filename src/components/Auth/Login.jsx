import { useState } from 'react';

export default function Login({ signIn, signUp }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    const { error: err } =
      mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (mode === 'signup') {
      setInfo('Cuenta creada. Si el proyecto Supabase requiere confirmación por email, revisa la bandeja de entrada antes de entrar.');
    }
  };

  return (
    <div className="authwrap">
      <form className="authcard" onSubmit={submit}>
        <div className="brand" style={{ border: 'none', marginBottom: 18, padding: 0, textAlign: 'center', display: 'block' }}>
          <img src="/logo.png" alt="Estructuras Humanizadoras" style={{ maxWidth: 200, width: '100%', margin: '0 auto 6px' }} />
          <div className="sub">Gestión de obras y facturación</div>
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="authmsg error">{error}</div>}
        {info && <div className="authmsg info">{info}</div>}
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button
          type="button"
          className="btn ghost"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setInfo('');
          }}
        >
          {mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta — entrar'}
        </button>
      </form>
    </div>
  );
}
