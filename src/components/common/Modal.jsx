export default function Modal({ title, wide, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
