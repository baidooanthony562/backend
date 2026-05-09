export default function CategoryCard({ category }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-center transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-green text-white">
        <span className="text-3xl">{category.icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
      <p className="mt-2 text-sm text-slate-500">{category.description}</p>
    </div>
  );
}
