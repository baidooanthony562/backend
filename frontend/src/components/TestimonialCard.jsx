export default function TestimonialCard({ quote, name, role }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-lg">
      <p className="text-slate-600">“{quote}”</p>
      <div className="mt-6">
        <p className="font-semibold text-slate-900">{name}</p>
        <p className="text-sm text-slate-500">{role}</p>
      </div>
    </div>
  );
}
