import { Link } from 'react-router-dom';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-brand-gold' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-slate-500">({rating?.toFixed(1) || '0.0'})</span>
    </div>
  );
}

export default function ProductCard({ product }) {
  const productId = product._id || product.id;
  const productImage = product.images?.[0] || product.image;
  const productCategory = typeof product.category === 'string' ? product.category : product.category?.name || 'Appliances';
  const discount = product.discount || 0;
  const originalPrice = discount > 0 ? (product.price / (1 - discount / 100)) : null;

  const addToCart = (e) => {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => (item.id || item._id) === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, id: productId, image: productImage, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    alert('Added to cart!');
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/product/${productId}`} className="relative block overflow-hidden bg-slate-100">
        {discount > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        {product.bestseller && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-gold px-2 py-0.5 text-xs font-bold text-black">
            Best Seller
          </span>
        )}
        <div className="aspect-square overflow-hidden">
          <img
            src={productImage}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-gold">{productCategory}</span>
        <Link to={`/product/${productId}`}>
          <h3 className="text-sm font-semibold leading-snug text-slate-900 hover:text-brand-dark line-clamp-2">{product.name}</h3>
        </Link>
        <StarRating rating={product.rating} />
        <div className="mt-auto flex items-center gap-2">
          <span className="text-lg font-bold text-brand-dark">₵{Number(product.price).toFixed(2)}</span>
          {originalPrice && (
            <span className="text-sm text-slate-400 line-through">₵{originalPrice.toFixed(2)}</span>
          )}
        </div>
        <button
          onClick={addToCart}
          className="mt-1 w-full rounded-full bg-brand-gold py-2 text-sm font-semibold text-black transition hover:bg-yellow-400 active:scale-95"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
