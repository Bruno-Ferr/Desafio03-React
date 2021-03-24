import { totalmem } from 'node:os';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(product => product.id === productId);

      if(!productAlreadyInCart) {
        const product = await api.get<Product>(`products/${productId}`); //<Products> é a tipagem doq a api.get irá retornar
        const stock = await api.get<Stock>(`stock/${productId}`); //<Stock> é a tipagem doq a api.get irá retornar

        if(stock.data.amount > 0 ) {
          setCart([...cart, { ...product.data, amount: 1 } ]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...product.data, amount: 1 }]));
          toast('Adicionado!');
        }
        
      } else {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if(stock.amount > productAlreadyInCart.amount) {
          const updatedCart = cart.map(product => product.id === productId ? { 
            ...product, 
            amount: Number(product.amount) + 1 
          }: product);

          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removeProduct = cart.filter(product => product.id !== productId);
      setCart(removeProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProduct));
      toast('Item removido!');
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Erro na alteração da quantidade de produtos')
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const stockIsEmpty = amount > stock.amount

      if(stockIsEmpty) {
        toast.error('Quantidade selecionada fora do estoque!');
      }

      const updateCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount
      }: product)

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

    } catch {
      toast.error('Erro na alteração da quantidade de produtos')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
