import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchProduct, submitReview, addWishlistItem } from '../utils/api';
import { getToken, isAuthenticated } from '../utils/auth';
import { featuredProducts } from '../data/products';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [wishlistMessage, setWishlistMessage] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);
  const token = getToken();

  useEffect(() => {
    setLoading(true);
    fetchProduct(id)
      .then((response) => {
        setProduct(response.data);
      })
      .catch(() => {
        setProduct(featuredProducts.find((item) => item.id === id) || featuredProducts[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !product) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
        <div className="rounded-[2rem] bg-white p-10 shadow-sm text-center">Loading product...</div>
      </section>
    );
  }

  const productId = product.id || product._id;
  const productImage = product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=800&q=80';
  const productCategory = typeof product.category === 'string' ? product.category : product.category?.name || 'Appliances';

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => (item.id || item._id) === productId);
    if (existing) existing.quantity += quantity;
    else cart.push({ ...product, id: productId, image: productImage, quantity });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Added to cart');
  };

  const buyNow = () => {
    addToCart();
    window.location.href = '/cart';
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    setReviewMessage('');
    try {
      await submitReview(productId, { rating: reviewRating, comment: reviewComment }, token);
      const response = await fetchProduct(productId);
      setProduct(response.data);
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
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    setAddingWishlist(true);
    setWishlistMessage('');
    try {
      await addWishlistItem(productId, token);
      setWishlistMessage('Added to your wishlist.');
    } catch (err) {
      setWishlistMessage(err.response?.data?.message || 'Unable to add to wishlist.');
    } finally {
      setAddingWishlist(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <img src={productImage} alt={product.name} className="w-full rounded-[2rem] object-cover" />
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-slate-900">{product.name}</h1>
                <p className="mt-2 text-sm uppercase tracking-[0.3em] text-brand-gold">{productCategory}</p>
              </div>
              <span className="text-3xl font-semibold text-brand-dark">₵{Number(product.price).toFixed(2)}</span>
            </div>
            <p className="text-slate-600">{product.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Stock availability</p>
                <p className={`mt-2 text-lg font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {product.stock > 0 ? 'In stock' : 'Out of stock'}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Rating</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{product.rating?.toFixed(1) || '0.0'} / 5</p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Purchase details</h2>
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                <span className="text-sm text-slate-700">Quantity</span>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-24 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-right text-slate-900"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={addToCart} className="rounded-full bg-brand-gold px-6 py-4 text-sm font-semibold text-black transition hover:bg-yellow-400">
                  Add to cart
                </button>
                <button onClick={buyNow} className="rounded-full bg-brand-dark px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Buy now
                </button>
              </div>
              <button
                onClick={handleWishlist}
                disabled={addingWishlist}
                className="w-full rounded-full bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {addingWishlist ? 'Saving...' : 'Add to wishlist'}
              </button>
              {wishlistMessage && <p className="text-sm text-slate-600">{wishlistMessage}</p>}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Customer reviews</h2>
            <div className="mt-5 space-y-4">
              {product.reviews?.length ? (
                product.reviews.map((review) => (
                  <div key={review._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{review.user?.name || 'Customer'}</p>
                      <span className="text-sm text-slate-500">{review.rating} / 5</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{review.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No reviews yet. Be the first to share your experience.</p>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Write a review</h2>
            <form onSubmit={handleReviewSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Rating
                <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold">
                  {[5, 4, 3, 2, 1].map((rate) => (
                    <option key={rate} value={rate}>{rate} stars</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Review
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows="4"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-gold"
                  placeholder="Tell other shoppers what you liked about this item"
                />
              </label>
              <button type="submit" disabled={submittingReview} className="w-full rounded-full bg-brand-dark px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                {submittingReview ? 'Submitting...' : 'Submit review'}
              </button>
              {reviewMessage && <p className="text-sm text-slate-600">{reviewMessage}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
