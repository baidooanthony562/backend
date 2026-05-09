import { Link } from 'react-router-dom';

const links = [
  { label: 'About', href: '/#about' },
  { label: 'Shop', href: '/shop' },
  { label: 'Support', href: '/#contact' },
  { label: 'Admin', href: '/admin' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3 md:px-8">
        <div>
          <h3 className="mb-4 text-xl font-semibold text-white">Cindy Nut Enterprise</h3>
          <p className="max-w-sm leading-7 text-slate-300">
            Professional home appliances and kitchenware with fast shipping, trusted support, and premium service for every home.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-lg font-semibold text-white">Explore</h4>
          <ul className="space-y-3 text-slate-300">
            {links.map((item) => (
              <li key={item.label}>
                <Link to={item.href} className="transition hover:text-brand-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-lg font-semibold text-white">Contact</h4>
          <p className="text-slate-300">support@cindynut.com</p>
          <p className="mt-2 text-slate-300">+234 800 123 4567</p>
          <p className="mt-2 text-slate-300">Lagos, Nigeria</p>
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-sm text-slate-500 md:px-8">
        © 2026 Cindy Nut Enterprise. Crafted for premium kitchen & home appliance experiences.
      </div>
    </footer>
  );
}
