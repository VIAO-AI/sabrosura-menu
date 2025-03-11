import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { supabase, isAuthenticated } from '@/lib/supabase';
import { MenuItem } from '@/data/menuData';
import { Plus, Edit, Trash, Loader2, LogOut } from 'lucide-react';

const AdminMenu = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchMenuItems();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('menu_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'menu_items'
      }, (payload) => {
        console.log('Real-time update:', payload);
        fetchMenuItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const checkAuth = async () => {
    try {
      // First check Supabase auth
      const authenticated = await isAuthenticated();
      
      // Then check dev mode auth if Supabase auth failed
      const devAuthenticated = localStorage.getItem('dev_admin_authenticated') === 'true';
      
      if (!authenticated && !devAuthenticated) {
        toast({
          variant: "destructive",
          title: "Sesión no válida",
          description: "Por favor, inicie sesión para acceder al panel de administración",
        });
        navigate('/admin');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      
      // Check dev mode auth as fallback
      const devAuthenticated = localStorage.getItem('dev_admin_authenticated') === 'true';
      if (!devAuthenticated) {
        navigate('/admin');
      }
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('menu_items')
        .select('*');

      if (error) {
        console.error('Supabase fetch error:', error);
        
        // If Supabase fails, use mock data for development/demo
        if (localStorage.getItem('dev_admin_authenticated') === 'true') {
          // Mock data for development/demo
          const mockData: MenuItem[] = [
            {
              id: '1',
              name: { en: 'Lomo Saltado', es: 'Lomo Saltado' },
              description: { 
                en: 'Stir-fried beef with onions, tomatoes and french fries', 
                es: 'Carne de res salteada con cebollas, tomates y papas fritas' 
              },
              price: '$15.99',
              category: 'mainDish',
              isPopular: true,
              isVegetarian: false,
              ingredients: ['beef', 'onions', 'tomatoes', 'soy sauce', 'french fries'],
              image: '/placeholder.svg'
            },
            {
              id: '2',
              name: { en: 'Ceviche', es: 'Ceviche' },
              description: { 
                en: 'Fresh fish cured in citrus juices with onions and chili peppers', 
                es: 'Pescado fresco curado en jugos cítricos con cebollas y ajíes' 
              },
              price: '$14.99',
              category: 'coldDishes',
              isPopular: true,
              isVegetarian: false,
              ingredients: ['fish', 'lime juice', 'onions', 'cilantro', 'chili peppers'],
              image: '/placeholder.svg'
            }
          ];
          
          setItems(mockData);
          toast({
            title: "Modo de desarrollo",
            description: "Usando datos de muestra para desarrollo",
          });
        }
      } else {
        setItems(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching menu items:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar elementos del menú",
        description: error.message,
      });
      
      // Use mock data if in development mode
      if (localStorage.getItem('dev_admin_authenticated') === 'true') {
        setItems([
          // Mock data would go here - same as above
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      setLoading(true);
      
      // Try to update in Supabase
      const { error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        
        // In development mode, simulate successful update
        if (localStorage.getItem('dev_admin_authenticated') === 'true') {
          // Just update local state for demo purposes
          setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
        } else {
          throw error;
        }
      }

      toast({
        title: "Éxito",
        description: "Elemento del menú actualizado correctamente",
      });
      
      fetchMenuItems();
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al actualizar el elemento del menú",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este elemento?')) return;
    
    try {
      setLoading(true);
      
      // Try to delete in Supabase
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        
        // In development mode, simulate successful delete
        if (localStorage.getItem('dev_admin_authenticated') === 'true') {
          // Just update local state for demo purposes
          setItems(items.filter(item => item.id !== id));
        } else {
          throw error;
        }
      }

      toast({
        title: "Éxito",
        description: "Elemento del menú eliminado correctamente",
      });
      
      fetchMenuItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar el elemento del menú",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Try Supabase sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Always clear local storage auth
      localStorage.removeItem('dev_admin_authenticated');
      
      toast({
        title: "Sesión cerrada",
        description: "Ha cerrado sesión correctamente",
      });
      navigate('/admin');
    } catch (error: any) {
      console.error('Sign out error:', error);
      
      // Ensure local storage is cleared even if Supabase fails
      localStorage.removeItem('dev_admin_authenticated');
      
      toast({
        title: "Sesión cerrada",
        description: "Ha cerrado sesión correctamente",
      });
      navigate('/admin');
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-peru-beige/10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-peru-red animate-spin" />
          <p className="mt-2 text-peru-brown">Cargando elementos del menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-peru-beige/10 pb-10">
      <header className="bg-white shadow-sm py-4 px-6 mb-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-peru-red flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="font-title text-xl font-bold text-peru-brown">Panel de Administración</span>
          </div>
          <button
            onClick={signOut}
            className="bg-peru-red text-white px-4 py-2 rounded hover:bg-peru-terracotta transition-colors flex items-center gap-2"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-title text-peru-brown">Gestión del Menú</h1>
          <button
            className="bg-peru-red text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-peru-terracotta transition-colors"
            onClick={() => {
              // Implementar modal o página para agregar nuevo elemento
              toast({
                title: "Próximamente",
                description: "Funcionalidad en desarrollo",
              });
            }}
          >
            <Plus size={18} /> Añadir Elemento
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">No hay elementos en el menú. ¡Añade algunos!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-title text-lg text-peru-brown">{item.name.en}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                  </div>
                  <div className="text-peru-ochre font-semibold">{item.price}</div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {item.description.en}
                </p>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEditing(true);
                    }}
                    className="text-peru-red hover:text-peru-terracotta transition-colors flex items-center gap-1"
                  >
                    <Edit size={16} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                  >
                    <Trash size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {isEditing && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-title text-peru-brown mb-4">Editar elemento</h2>
            {/* Formulario de edición aquí */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Implementar lógica de guardar cambios
                  setIsEditing(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 bg-peru-red text-white rounded"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
