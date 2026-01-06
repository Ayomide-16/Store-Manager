import { supabase } from '../client'

export async function fetchInventoryItems(filters = {}) {
  try {
    let query = supabase
      .from('items')
      .select(`
        *,
        categories ( id, name )
      `)
      .order('name', { ascending: true })

    if (filters.categoryId && filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters.searchQuery) {
      query = query.or(`name.ilike.%${filters.searchQuery}%,sku.ilike.%${filters.searchQuery}%`)
    }

    const { data, error } = await query
    if (error) throw error
    
    if (!data) return { data: [], error: null };

    // Map database snake_case to frontend camelCase
    return { 
      data: data.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        categoryId: item.category_id,
        unit: item.unit,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        quantityInStock: item.quantity_in_stock,
        reorderLevel: item.reorder_level,
        expiryDate: item.expiry_date,
        notes: item.notes,
        tags: item.tags,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })), 
      error: null 
    }
  } catch (error) {
    console.error('Fetch inventory error:', error.message || error)
    return { data: [], error }
  }
}

export async function createInventoryItem(itemData) {
  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        name: itemData.name,
        sku: itemData.sku || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`,
        category_id: itemData.categoryId,
        unit: itemData.unit,
        cost_price: itemData.costPrice,
        selling_price: itemData.sellingPrice,
        quantity_in_stock: itemData.quantityInStock || 0,
        reorder_level: itemData.reorderLevel || 10,
        expiry_date: itemData.expiryDate || null,
        notes: itemData.notes || null,
        tags: itemData.tags || []
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Create item error:', error.message || error)
    return { data: null, error }
  }
}

export async function seedMockInventory() {
  try {
    const { data: existing } = await supabase.from('items').select('id').limit(1)
    if (existing && existing.length > 0) return 

    // Initialize core categories
    const categories = ['Groceries', 'Beverages', 'Toiletries', 'Grains'];
    for (const catName of categories) {
      await supabase.from('categories').upsert({ name: catName }, { onConflict: 'name' });
    }
    
    const { data: catList } = await supabase.from('categories').select('*');
    if (!catList) return;

    const findCat = (name) => catList.find(c => c.name === name)?.id;

    const mockItems = [
      { name: 'Peak Milk 500g', sku: 'MILK-PEAK-500', category_id: findCat('Groceries'), unit: 'pcs', cost_price: 2400, selling_price: 2800, quantity_in_stock: 50, reorder_level: 10, tags: ['dairy'] },
      { name: 'Indomie Chicken 70g', sku: 'NDL-IND-CHK-70', category_id: findCat('Grains'), unit: 'carton', cost_price: 6500, selling_price: 7200, quantity_in_stock: 20, reorder_level: 5, tags: ['fast-moving'] },
      { name: 'Dangote Sugar 1kg', sku: 'SGR-DAN-1KG', category_id: findCat('Groceries'), unit: 'pcs', cost_price: 1100, selling_price: 1350, quantity_in_stock: 100, reorder_level: 20, tags: ['essential'] },
      { name: 'Milo 400g Tin', sku: 'BVG-MILO-400', category_id: findCat('Beverages'), unit: 'pcs', cost_price: 3200, selling_price: 3800, quantity_in_stock: 30, reorder_level: 8, tags: ['popular'] }
    ];

    await supabase.from('items').insert(mockItems)
    console.log('Seeded Nigerian products successfully')
  } catch (error) {
    console.error('Seeding error:', error.message || error)
  }
}
