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
    <div className="group flex flex-col bg-white border border-slate-200 hover:shadow-lg transition rounded-sm overflow-hidden">
      {/* Image */}
      <Link to={`/product/${productId}`} className="relative block bg-slate-50 p-4">
        {discount > 0 && !isWholesaleQty && (
          <span className="absolute left-2 top-2 z-10 rounded-sm bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        {isWholesaleQty && (
          <span className="absolute left-2 top-2 z-10 rounded-sm bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white">
            Wholesale
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
            onError={(e) => { e.target.src = PLACEHOLDER; }}
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={`/product/${productId}`}>
          <h3 className="text-sm font-medium leading-snug text-slate-900 hover:text-[#C7511F] line-clamp-2">{product.name}</h3>
        </Link>

        <StarRating rating={product.rating} />

        {/* Price display */}
        <div className="mt-1">
          {originalPrice && (
            <p className="text-xs text-slate-400 line-through">₵{originalPrice.toFixed(2)}</p>
          )}
          <div className="flex items-baseline gap-2">
            <p className={`text-lg font-bold ${isWholesaleQty ? 'text-emerald-600' : 'text-slate-900'}`}>
              <span className="text-sm font-normal align-top">₵</span>
              {unitPrice.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-slate-400">/ unit</span>
            </p>
          </div>
          {isWholesaleQty && (
            <p className="text-xs font-semibold text-emerald-600">
              Save ₵{(product.price - product.wholesalePrice).toFixed(2)}/unit wholesale
            </p>
          )}
          {!isWholesaleQty && discount > 0 && (
            <p className="text-xs font-semibold text-red-600">
              Save ₵{(originalPrice - product.price).toFixed(2)} ({discount}% off)
            </p>
          )}
        </div>

        {/* Wholesale tier hint */}
        {hasWholesale && !isWholesaleQty && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
            🏭 Wholesale ₵{product.wholesalePrice}/unit from {product.wholesaleMinQty} units
          </p>
        )}

        <p className={`text-xs ${inStock ? 'text-[#007185]' : 'text-red-500'}`}>
          {inStock ? `✓ ${product.stock} in stock` : '✗ Out of stock'}
        </p>

        {/* Quantity stepper */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Qty:</span>
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={(e) => { e.preventDefault(); changeQty(-1); }}
              disabled={qty <= 1}
              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
            >
              −
            </button>
            <span className="px-3 py-1 text-sm font-bold text-slate-900 min-w-[2rem] text-center border-x border-slate-200">
              {qty}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); changeQty(1); }}
              disabled={qty >= maxStock}
              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
            >
              +
            </button>
          </div>
          {qty > 1 && (
            <span className="text-xs font-semibold text-slate-500">
              = ₵{(unitPrice * qty).toFixed(2)}
            </span>
          )}
        </div>

        <button
          onClick={addToCart}
          disabled={!inStock}
          className={`mt-1 w-full rounded-full py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            isWholesaleQty
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-brand-gold text-slate-900 hover:bg-yellow-400'
          }`}
        >
          {inStock
            ? isWholesaleQty
              ? `Add ${qty} at Wholesale Price`
              : `Add ${qty > 1 ? qty + ' to' : 'to'} Cart`
            : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
