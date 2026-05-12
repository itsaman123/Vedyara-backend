const fs = require('fs');
const path = 'D:/Freelance-work/Vedyara-frontend/src/pages/Products.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');
lines[54] = `/* ═══════════════════════════════════════════════════════════
   ANIMATED PRODUCT CARD
═══════════════════════════════════════════════════════════ */
const AnimatedProductCard = ({
  product,
  index,
  onView,
  onBuyNow,
  viewMode,
}: {
  product: any;
  index: number;
  onView: (p: any) => void;
  onBuyNow: (p: any) => void;
  viewMode: "grid" | "list";
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  if (viewMode === "list") {`;
fs.writeFileSync(path, lines.join('\n'));
