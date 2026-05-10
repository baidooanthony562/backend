import { Link } from 'react-router-dom';

function StarRating({ rating, count }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className={`h-3.5 w-3.5 ${s <= full ? 'text-brand-gold' : s === full + 1 && half ? 'text-brand-gold opacity-60' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">
        {count || Math.floor(Math.random() * 900 + 100)}
      </span>
    </div>
  );
}

export default function ProductCard({ product }) {
  const productId = product._id || product.id;
  const productImage = product.images?.[0] || product.image;
  const discount = product.discount || 0;
  const originalPrice = discount > 0 ? (product.price / (1 - discount / 100)) : null;

  const addToCart = (e) => {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => (item.id || item._id) === productId);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, id: productId, image: productImage, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    alert('Added to cart!');
  };

  return (
    <div className="group flex flex-col bg-white border border-slate-200 hover:shadow-lg transition rounded-sm overflow-hidden">
      {/* Image area */}
      <Link to={`/product/${productId}`} className="relative block bg-slate-50 p-4">
        {discount > 0 && (
          <span className="absolute left-2 top-2 z-10 rounded-sm bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        {product.bestseller && (
          <span className="absolute right-2 top-2 z-10 rounded-sm bg-[#232F3E] px-1.5 py-0.5 text-xs font-bold text-white">
            #1 Best Seller
          </span>
        )}
        <div className="aspect-square overflow-hidden flex items-center justify-center">
          <img
            src={productImage}
            alt={product.name}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={`/product/${productId}`}>
          <h3 className="text-sm font-medium leading-snug text-slate-900 hover:text-[#C7511F] line-clamp-2">{product.name}</h3>
        </Link>

        <StarRating rating={product.rating} />

        <div className="mt-1">
          {originalPrice && (
            <p className="text-xs text-slate-500">
              Was: <span className="line-through">₵{originalPrice.toFixed(2)}</span>
            </p>
          )}
          <p className="text-lg font-bold text-slate-900">
            <span className="text-sm font-normal align-top">₵</span>
            {Number(product.price).toFixed(2)}
          </p>
          {discount > 0 && (
            <p className="text-xs font-semibold text-red-600">Save ₵{(originalPrice - product.price).toFixed(2)} ({discount}%)</p>
          )}
        </div>

        <p className="text-xs text-[#007185]">✓ In Stock — Ships from Kumasi</p>

        <button
          onClick={addToCart}
          className="mt-auto w-full rounded-full bg-brand-gold py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-400 active:scale-95"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
