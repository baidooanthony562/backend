import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProduct, submitReview, addWishlistItem } from '../utils/api';
import { getToken, isAuthenticated } from '../utils/auth';
import { getProducts } from '../utils/productStore';
import { showToast } from '../components/Toast';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80';

function StarFull() {
  return (
    <svg className="h-4 w-4 text-brand-gold" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const token = getToken();

  useEffect(() => {
    setLoading(true);
    fetchProduct(id)
      .then((response) => setProduct(response.data))
      .catch(() => {
        const local = getProducts();
        setProduct(local.find((item) => item.id === id || item._id === id) || local[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-96 rounded-xl bg-slate-200" />
          <div className="h-8 w-1/2 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-200" />
        </div>
      </section>
    );
  }

  if (!product) return null;

  const productId = product.id || product._id;
  const productImage = product.images?.[0] || product.image || PLACEHOLDER;
  const productCategory = typeof product.category === 'string' ? product.category : product.category?.name || 'Appliances';

  const hasWholesale = product.wholesalePrice && product.wholesaleMinQty;
  const isWholesaleQty = hasWholesale && quantity >= product.wholesaleMinQty;
  const unitPrice = isWholesaleQty ? product.wholesalePrice : product.price;
  const lineTotal = unitPrice * quantity;
  const savingsPerUnit = isWholesaleQty ? (product.price - product.wholesalePrice) : 0;
  const maxStock = Number(product.stock) || 99;
  const inStock = maxStock > 0;

  const changeQty = (delta) => setQuantity((q) => Math.min(maxStock, Math.max(1, q + delta)));

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => (item.id || item._id) === productId);
    if (existing) {
      existing.quantity += quantity;
      existing.unitPrice = unitPrice;
      existing.isWholesale = isWholesaleQty;
    } else {
      cart.push({
        ...product,
        id: productId,
        image: productImage,
        quantity,
        unitPrice,
        retailPrice: product.price,
        wholesalePrice: product.wholesalePrice,
        wholesaleMinQty: product.wholesaleMinQty,
        isWholesale: isWholesaleQty,
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    showToast(`${quantity}x ${product.name} added to cart${isWholesaleQty ? ' at wholesale price' : ''}`);
  };

  const buyNow = () => { addToCart(); navigate('/cart'); };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated()) { navigate('/login'); return; }
    setSubmittingReview(true);
    setReviewMessage('');
    try {
      await submitReview(productId, { rating: reviewRating, comment: reviewComment }, token);
      const response = await fetchProduct(productId);
      setProduct(response.data);
      showToast('Review submitted — thank you!');
      setReviewMessage('Thank you! Your review has been submitted.');
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewMessage(err.response?.data?.message || 'Unable to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated()) { navigate('/login'); return; }
    try {
      await addWishlistItem(productId, token);
      showToast('Added to your wishlist ❤️');
    } catch (err) {
      showToast(err.response?.data?.message || 'Already in wishlist.', 'error');
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">

        {/* Left — Image + Description */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <img
              src={productImage}
              alt={product.name}
              className="mx-auto h-72 w-full object-contain md:h-96"
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">About this product</h2>
            <p className="mt-3 leading-relaxed text-slate-600">{product.description || 'No description available.'}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
                <p className="mt-1 font-semibold text-slate-800">{productCategory}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rating</p>
                <div className="mt-1 flex items-center gap-1">
                  <StarFull />
                  <span className="font-semibold text-slate-800">{(product.rating || 4.5).toFixed(1)} / 5</span>
                </div>
              </div>
              <div className={`rounded-lg p-3 ${inStock ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stock</p>
                <p className={`mt-1 font-semibold ${inStock ? 'text-emerald-700' : 'text-red-700'}`}>
                  {inStock ? `${maxStock} units available` : 'Out of stock'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">SKU</p>
                <p className="mt-1 font-semibold text-slate-800">{String(productId).slice(-8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Customer reviews</h2>
            <div className="mt-4 space-y-3">
              {product.reviews?.length ? product.reviews.map((r) => (
                <div key={r._id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{r.user?.name || 'Customer'}</p>
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <svg key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'text-brand-gold' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No reviews yet. Be the first!</p>
              )}
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <p className="text-sm font-bold text-slate-700">Write a review</p>
              <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-gold">
                {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} stars</option>)}
              </select>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows="3" placeholder="Share your experience..." className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-gold" />
              <button type="submit" disabled={submittingReview} className="rounded-full bg-[#131921] px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {submittingReview ? 'Submitting...' : 'Submit review'}
              </button>
              {reviewMessage && <p className="text-sm text-slate-600">{reviewMessage}</p>}
            </form>
          </div>
        </div>

        {/* Right — Pricing & Purchase */}
        <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">

          {/* Product name + price */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">{productCategory}</p>
            <h1 className="mt-2 text-2xl font-extrabold leading-snug text-slate-900">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex">{[1,2,3,4,5].map((s) => <StarFull key={s} />)}</div>
              <span className="text-xs text-slate-500">{(product.rating || 4.5).toFixed(1)}</span>
            </div>

            {/* Pricing tiers */}
            <div className="mt-4 space-y-2">
              <div className={`flex items-center justify-between rounded-lg border-2 p-3 ${!isWholesaleQty ? 'border-brand-gold bg-amber-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Retail (1–{(product.wholesaleMinQty || 99) - 1} units)</p>
                  <p className="text-xl font-extrabold text-slate-900">₵{Number(product.price).toFixed(2)}<span className="ml-1 text-xs font-normal text-slate-400">/ unit</span></p>
                </div>
                {!isWholesaleQty && <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-black">Your Price</span>}
              </div>

              {hasWholesale && (
                <div className={`flex items-center justify-between rounded-lg border-2 p-3 ${isWholesaleQty ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Wholesale ({product.wholesaleMinQty}+ units)</p>
                    <p className="text-xl font-extrabold text-emerald-700">₵{Number(product.wholesalePrice).toFixed(2)}<span className="ml-1 text-xs font-normal text-slate-400">/ unit</span></p>
                    <p className="text-xs font-semibold text-emerald-600">Save ₵{(product.price - product.wholesalePrice).toFixed(2)} per unit</p>
                  </div>
                  {isWholesaleQty && <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Your Price</span>}
                </div>
              )}
            </div>
          </div>

          {/* Quantity + Add to Cart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">Select Quantity</p>

            {/* Quantity selector */}
            <div className="flex items-center gap-3">
              <button onClick={() => changeQty(-1)} disabled={quantity <= 1} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30">−</button>
              <input
                type="number"
                value={quantity}
                min={1}
                max={maxStock}
                onChange={(e) => setQuantity(Math.min(maxStock, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-slate-200 py-2 text-center text-lg font-bold outline-none focus:border-brand-gold"
              />
              <button onClick={() => changeQty(1)} disabled={quantity >= maxStock} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30">+</button>
              <span className="text-sm text-slate-500">of {maxStock} available</span>
            </div>

            {/* Wholesale nudge */}
            {hasWholesale && !isWholesaleQty && (
              <button
                onClick={() => setQuantity(product.wholesaleMinQty)}
                className="mt-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 transition hover:bg-emerald-100"
              >
                🏭 Add {product.wholesaleMinQty - quantity} more to unlock wholesale price (₵{product.wholesalePrice}/unit)
              </button>
            )}

            {/* Line total */}
            <div className={`mt-4 flex items-center justify-between rounded-lg p-3 ${isWholesaleQty ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-800'}`}>
              <span className="text-sm font-semibold">{quantity} × ₵{unitPrice.toFixed(2)}</span>
              <span className="text-xl font-extrabold">₵{lineTotal.toFixed(2)}</span>
            </div>
            {isWholesaleQty && (
              <p className="mt-1 text-center text-xs font-semibold text-emerald-600">
                You're saving ₵{(savingsPerUnit * quantity).toFixed(2)} total with wholesale pricing
              </p>
            )}

            {/* Buttons */}
            <div className="mt-4 space-y-2">
              <button
                onClick={addToCart}
                disabled={!inStock}
                className={`w-full rounded-full py-3.5 text-sm font-extrabold transition hover:opacity-90 disabled:opacity-50 ${isWholesaleQty ? 'bg-emerald-600 text-white' : 'bg-brand-gold text-black'}`}
              >
                {inStock ? `Add ${quantity} to Cart` : 'Out of Stock'}
              </button>
              <button
                onClick={buyNow}
                disabled={!inStock}
                className="w-full rounded-full border border-slate-200 bg-[#131921] py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Buy Now
              </button>
              <button
                onClick={handleWishlist}
                className="w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ❤️ Save to Wishlist
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              🔒 Secure checkout · 📞 Call 0257543723 for bulk orders
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
