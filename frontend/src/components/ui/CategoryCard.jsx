'use client';
// frontend/src/components/ui/CategoryCard.jsx
// Reusable card for category-grid pages (Dashboard home, Assets, Incidents).
// No icon — bold larger title, one-line description below in smaller/lighter
// text, arrow in the bottom-right corner.

export default function CategoryCard({ title, description, onClick, sub }) {
  return (
    <button
      onClick={onClick}
      className="card p-5 text-left hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between min-h-[110px]"
    >
      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{title}</h3>
        {description && <p className="text-gray-400 text-xs">{description}</p>}
      </div>
      <div className="flex items-end justify-between mt-3">
        {sub ? <span className="text-gray-400 text-xs">{sub}</span> : <span />}
        <span className="text-gray-400 text-lg">→</span>
      </div>
    </button>
  );
}