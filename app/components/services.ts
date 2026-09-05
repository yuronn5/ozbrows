import type { Service } from "./PricesModal";

export const services: Service[] = [
  { id: "brow-lam-tint-tweeze", title: "Brow lamination + tint + tweeze", price: "$100", duration: "1 h", category: "Brows" },
  { id: "brow-lam-tweeze", title: "Brow lamination + tweeze", price: "$90", duration: "30 min", category: "Brows" },
  { id: "brow-tint", title: "Brow tint", price: "$30", duration: "25 min", category: "Brows" },
  { id: "wax-brows", title: "Wax brows", price: "$25", duration: "15 min", category: "Brows" },
  { id: "wax-tint", title: "Wax + tint", price: "$60", duration: "40 min", category: "Brows" },
  { id: "lip-wax", title: "Lip wax", price: "$15", duration: "15 min", category: "Brows" },
  { id: "lash-tint", title: "Lash tint", price: "$30", duration: "15 min", category: "Lashes" },
  { id: "makeup-nude", title: "Nude/Day makeup + lashes", price: "$130", duration: "1 h", category: "Make up" },
  { id: "makeup-evening", title: "Evening makeup + lashes", price: "$150", duration: "1 h 15 min", category: "Make up" },
  { id: "makeup-wedding", title: "Wedding makeup + lashes", price: "$170", duration: "1 h 20 min", category: "Make up" },
  { id: "makeup-ceremony", title: "Makeup for wedding ceremony + lashes", price: "$150", duration: "1 h 15 min", category: "Make up" },
];
