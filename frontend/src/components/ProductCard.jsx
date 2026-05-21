import { useState } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from './Toast';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80';

function starCount(rating) {
  const seed = Math.round((rating || 4.5) * 37);
  return 100 + (seed * 17 + 43) % 900;
}

function StarRating({ rating }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5;
  const count = starCount(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className={`h-3.5 w-3.5 ${s <= full ? 'text-brand-gold' : s === full + 1 && half ? 'text-brand-gold opacity-60' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-[#007185]">{count}</span>
    </div>
  );
}

export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1);

  const productId = product._id || product.id;
  const productImage = product.images?.[0] || product.image || PLACEHOLDER;
  const discount = product.discount || 0;
  const inStock = product.stock === undefined || Number(product.stock) > 0;
  const maxStock = Number(product.stock) || 99;

  const hasWholesale = product.wholesalePrice && product.wholesaleMinQty;
  const isWholesaleQty = hasWholesale && qty >= product.wholesaleMinQty;
  const unitPrice = isWholesaleQty ? product.wholesalePrice : product.price;
  const originalPrice = discount > 0 && !isWholesaleQty ? (product.price / (1 - discount / 100)) : null;

  const changeQty = (delta) => {
    setQty((prev) => Math.min(maxStock, Math.max(1, prev + delta)));
  };

  const addToCart = (e) => {
    e.preventDefault();
    if (!inStock) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => (item.id || item._id) === productId);
    if (existing) {
      existing.quantity += qty;
      existing.unitPrice = unitPrice;
      existing.isWholesale = isWholesaleQty;
    } else {
      cart.push({
        ...product,
        id: productId,
        image: productImage,
        quantity: qty,
        unitPrice,
        retailPrice: product.price,
        wholesalePrice: product.wholesalePrice,
        wholesaleMinQty: product.wholesaleMinQty,
        isWholesale: isWholesaleQty,
        category: typeof product.category === 'string' ? product.category : product.category?.name || '',
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    const label = qty > 1 ? `${qty}x ${product.name}` : product.name;
    showToast(`${label} added to cart${isWholesaleQty ? ' at wholesale price' : ''}`);
  };

  return (
    <div className="group flex flex-col bg-white border border-slate-200 hover:shadow-md transition rounded overflow-hidden">
      {/* Image */}
      <Link to={`/product/${productId}`} className="relative block bg-slate-50 p-2">
        {discount > 0 && !isWholesaleQty && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
            -{discount}%
          </span>
        )}
        {isWholesaleQty && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-emerald-600 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
            Wholesale
          </span>
        )}
        {product.bestseller && (
          <span className="absolute right-1.5 top-1.5 z-10 rounded bg-[#232F3E] px-1 py-0.5 text-[10px] font-bold text-white leading-none">
            Best Seller
          </span>
        )}
        {inStock && maxStock <= 10 && (
          <span className="absolute right-1.5 bottom-1.5 z-10 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
            {maxStock} left!
          </span>
        )}
        <div className="aspect-square overflow-hidden flex items-center justify-center">
          <img
            src={productImage}
            alt={product.name}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
            onError={(e) => { e.target.src = PLACEHOLDER; }}
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2">
        <Link to={`/product/${productId}`}>
          <h3 className="text-xs font-medium leading-snug text-slate-900 hover:text-[#C7511F] line-clamp-2 sm:text-sm">{product.name}</h3>
        </Link>

        <StarRating rating={product.rating} />

        {/* Price */}
        <div className="mt-0.5">
          {originalPrice && (
            <p className="text-[10px] text-slate-400 line-through">₵{originalPrice.toFixed(2)}</p>
          )}
          <p className={`text-sm font-bold sm:text-base ${isWholesaleQty ? 'text-emerald-600' : 'text-slate-900'}`}>
            ₵{unitPrice.toFixed(2)}
          </p>
          {!isWholesaleQty && discount > 0 && (
            <p className="text-[10px] font-semibold text-red-600">Save ₵{(originalPrice - product.price).toFixed(2)}</p>
          )}
        </div>

        <p className={`text-[10px] font-semibold sm:text-xs ${!inStock ? 'text-red-500' : maxStock <= 5 ? 'text-red-600' : maxStock <= 10 ? 'text-amber-600' : 'text-[#007185]'}`}>
          {!inStock ? '✗ Out of stock' : maxStock <= 10 ? `⚡ Only ${maxStock} left` : '✓ In stock'}
        </p>

        {/* Quantity stepper */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded border border-slate-200 overflow-hidden">
            <button onClick={(e) => { e.preventDefault(); changeQty(-1); }} disabled={qty <= 1}
              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold">−</button>
            <span className="px-2 py-0.5 text-xs font-bold text-slate-900 min-w-[1.5rem] text-center border-x border-slate-200">{qty}</span>
            <button onClick={(e) => { e.preventDefault(); changeQty(1); }} disabled={qty >= maxStock}
              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold">+</button>
          </div>
          {qty > 1 && <span className="text-[10px] font-semibold text-slate-500">₵{(unitPrice * qty).toFixed(2)}</span>}
        </div>

        <button
          onClick={addToCart}
          disabled={!inStock}
          className={`mt-1 w-full rounded-full py-1.5 text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:py-2 ${
            isWholesaleQty ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-brand-gold text-slate-900 hover:bg-yellow-400'
          }`}
        >
          {inStock ? (isWholesaleQty ? 'Wholesale' : 'Add to Cart') : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
