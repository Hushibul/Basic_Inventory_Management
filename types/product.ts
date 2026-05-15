export type Product = {
  id: string;
  name: string;
  stock: number;
  numberOfSold: number;
  buyingPrice: number;
  expectedSellingPrice: number;
  offerPrice: number;
  supplier: string;
  imageUri: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductFormValues = {
  name: string;
  stock: string;
  numberOfSold: string;
  buyingPrice: string;
  expectedSellingPrice: string;
  offerPrice: string;
  supplier: string;
  imageUri: string;
};
