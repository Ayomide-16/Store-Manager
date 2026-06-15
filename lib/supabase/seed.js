import { supabaseAdmin } from './client';
import { UserRole } from '../../types';

/**
 * Seeds the Supabase database with demo users and a rich initial inventory of Nigerian products.
 */
export async function seedDatabase() {
  const results = {
    users: 0,
    categories: 0,
    items: 0,
    errors: []
  };

  try {
    // 1. Seed Demo Users
    const demoUsers = [
      {
        email: 'admin@demo.com',
        password: 'password123',
        metadata: { full_name: 'Shop Owner (Demo)', role: UserRole.ADMIN, shop_name: 'NaijaShop Demo' }
      },
      {
        email: 'salesperson@demo.com',
        password: 'password123',
        metadata: { full_name: 'Sales Staff (Demo)', role: UserRole.SALESPERSON, shop_name: 'NaijaShop Demo' }
      }
    ];

    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    // Check if we hit "Failed to fetch" or other network failure
    if (listError && (listError.message?.includes('fetch') || listError.message?.includes('NetworkError') || listError.status === 0)) {
      throw listError;
    }
    if (listError) throw listError;
    
    const existingUsers = listData?.users || [];

    for (const user of demoUsers) {
      const existing = existingUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());
      
      if (existing) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, { 
          email_confirm: true,
          user_metadata: user.metadata 
        });
        results.users++;
      } else {
        const { error } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          user_metadata: user.metadata,
          email_confirm: true
        });
        if (error) results.errors.push(`User error (${user.email}): ${error.message}`);
        else results.users++;
      }
    }

    // 2. Seed Categories
    const categories = [
      { name: 'Beverages' },
      { name: 'Noodles & Pasta' },
      { name: 'Grains & Flour' },
      { name: 'Provisions' },
      { name: 'Toiletries' },
      { name: 'Drinks (Soft)' },
      { name: 'Bakery' },
      { name: 'Household' }
    ];

    const { data: catData, error: catError } = await supabaseAdmin
      .from('categories')
      .upsert(categories, { onConflict: 'name' })
      .select();

    if (catError) {
      results.errors.push(`Category error: ${catError.message}`);
    } else {
      results.categories = catData?.length || 0;
    }

    // 3. Seed Comprehensive Inventory
    const findCat = (name) => catData?.find(c => c.name === name)?.id;
    
    const items = [
      // Beverages
      { name: 'Peak Milk (Tin) 160g', sku: 'BVG-PEA-TIN', category_id: findCat('Beverages'), unit: 'pcs', cost_price: 550, selling_price: 650, quantity_in_stock: 48, reorder_level: 12 },
      { name: 'Milo (Sachet) 20g x 10', sku: 'BVG-MIL-SAC', category_id: findCat('Beverages'), unit: 'pack', cost_price: 1200, selling_price: 1500, quantity_in_stock: 20, reorder_level: 5 },
      { name: 'Ovaltine 400g (Tin)', sku: 'BVG-OVA-400', category_id: findCat('Beverages'), unit: 'pcs', cost_price: 3800, selling_price: 4500, quantity_in_stock: 12, reorder_level: 3 },
      
      // Noodles
      { name: 'Indomie Chicken 70g', sku: 'NDL-IND-CHK', category_id: findCat('Noodles & Pasta'), unit: 'carton', cost_price: 6800, selling_price: 7500, quantity_in_stock: 15, reorder_level: 5 },
      { name: 'Indomie Onion 70g', sku: 'NDL-IND-ONN', category_id: findCat('Noodles & Pasta'), unit: 'carton', cost_price: 7200, selling_price: 8000, quantity_in_stock: 10, reorder_level: 3 },
      { name: 'Golden Penny Pasta 500g', sku: 'NDL-GPP-500', category_id: findCat('Noodles & Pasta'), unit: 'pcs', cost_price: 850, selling_price: 1000, quantity_in_stock: 40, reorder_level: 10 },
      
      // Provisions & Grains
      { name: 'Dangote Sugar 1kg', sku: 'GRN-DAN-SGR', category_id: findCat('Grains & Flour'), unit: 'pcs', cost_price: 1100, selling_price: 1300, quantity_in_stock: 25, reorder_level: 10 },
      { name: 'Mama Gold Rice 5kg', sku: 'GRN-MGR-5KG', category_id: findCat('Grains & Flour'), unit: 'pcs', cost_price: 6500, selling_price: 7800, quantity_in_stock: 8, reorder_level: 2 },
      { name: 'Honey Well Flour 1kg', sku: 'GRN-HWF-1KG', category_id: findCat('Grains & Flour'), unit: 'pcs', cost_price: 1200, selling_price: 1450, quantity_in_stock: 15, reorder_level: 5 },
      
      // Toiletries & Household
      { name: 'Dettol Soap (Cool) 70g', sku: 'TLT-DET-CL', category_id: findCat('Toiletries'), unit: 'pcs', cost_price: 450, selling_price: 550, quantity_in_stock: 36, reorder_level: 12 },
      { name: 'Ariel Detergent 400g', sku: 'HSH-ARI-400', category_id: findCat('Household'), unit: 'pcs', cost_price: 900, selling_price: 1100, quantity_in_stock: 24, reorder_level: 6 },
      { name: 'Sunlight Dishwash 500ml', sku: 'HSH-SUN-DW', category_id: findCat('Household'), unit: 'pcs', cost_price: 800, selling_price: 1000, quantity_in_stock: 18, reorder_level: 5 },
      
      // Soft Drinks
      { name: 'Coke 50cl (PET)', sku: 'DRK-COK-50', category_id: findCat('Drinks (Soft)'), unit: 'bottle', cost_price: 220, selling_price: 300, quantity_in_stock: 72, reorder_level: 24 },
      { name: 'Maltina (Classic) Can', sku: 'DRK-MLT-CAN', category_id: findCat('Drinks (Soft)'), unit: 'pcs', cost_price: 350, selling_price: 450, quantity_in_stock: 48, reorder_level: 12 },
      { name: 'Amstel Malta Can', sku: 'DRK-AMS-CAN', category_id: findCat('Drinks (Soft)'), unit: 'pcs', cost_price: 380, selling_price: 500, quantity_in_stock: 48, reorder_level: 12 }
    ];

    const { error: itemError } = await supabaseAdmin.from('items').upsert(items, { onConflict: 'sku' });
    if (itemError) {
      results.errors.push(`Items error: ${itemError.message}`);
    } else {
      results.items = items.length;
    }

    return results;
  } catch (err) {
    console.warn('Seeding online shifted to local fallback:', err.message || err);
    
    // Check if we hit "failed to fetch" or if any error was caught
    try {
      // Local Database Seed
      const categoriesOffline = [
        { id: 'cat-bev', name: 'Beverages', createdAt: new Date().toISOString() },
        { id: 'cat-ndl', name: 'Noodles & Pasta', createdAt: new Date().toISOString() },
        { id: 'cat-grn', name: 'Grains & Flour', createdAt: new Date().toISOString() },
        { id: 'cat-prv', name: 'Provisions', createdAt: new Date().toISOString() },
        { id: 'cat-tlt', name: 'Toiletries', createdAt: new Date().toISOString() },
        { id: 'cat-drk', name: 'Drinks (Soft)', createdAt: new Date().toISOString() },
        { id: 'cat-hsh', name: 'Household', createdAt: new Date().toISOString() }
      ];

      const itemsOffline = [
        { id: 'item-1', name: 'Peak Milk (Tin) 160g', sku: 'BVG-PEA-TIN', categoryId: 'cat-bev', unit: 'pcs', costPrice: 550, sellingPrice: 650, quantityInStock: 48, reorderLevel: 12, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-2', name: 'Milo (Sachet) 20g x 10', sku: 'BVG-MIL-SAC', categoryId: 'cat-bev', unit: 'pack', costPrice: 1200, sellingPrice: 1500, quantityInStock: 20, reorderLevel: 5, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-3', name: 'Ovaltine 400g (Tin)', sku: 'BVG-OVA-400', categoryId: 'cat-bev', unit: 'pcs', costPrice: 3800, sellingPrice: 4500, quantityInStock: 12, reorderLevel: 3, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-4', name: 'Indomie Chicken 70g', sku: 'NDL-IND-CHK', categoryId: 'cat-ndl', unit: 'carton', costPrice: 6800, sellingPrice: 7500, quantityInStock: 15, reorderLevel: 5, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-5', name: 'Indomie Onion 70g', sku: 'NDL-IND-ONN', categoryId: 'cat-ndl', unit: 'carton', costPrice: 7200, sellingPrice: 8000, quantityInStock: 10, reorderLevel: 3, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-6', name: 'Golden Penny Pasta 500g', sku: 'NDL-GPP-500', categoryId: 'cat-ndl', unit: 'pcs', costPrice: 850, sellingPrice: 1000, quantityInStock: 40, reorderLevel: 10, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-7', name: 'Dangote Sugar 1kg', sku: 'GRN-DAN-SGR', categoryId: 'cat-grn', unit: 'pcs', costPrice: 1100, sellingPrice: 1300, quantityInStock: 25, reorderLevel: 10, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-8', name: 'Mama Gold Rice 5kg', sku: 'GRN-MGR-5KG', categoryId: 'cat-grn', unit: 'pcs', costPrice: 6500, sellingPrice: 7800, quantityInStock: 8, reorderLevel: 2, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-9', name: 'Honey Well Flour 1kg', sku: 'GRN-HWF-1KG', categoryId: 'cat-grn', unit: 'pcs', costPrice: 1200, sellingPrice: 1450, quantityInStock: 15, reorderLevel: 5, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-10', name: 'Dettol Soap (Cool) 70g', sku: 'TLT-DET-CL', categoryId: 'cat-tlt', unit: 'pcs', costPrice: 450, sellingPrice: 550, quantityInStock: 36, reorderLevel: 12, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-11', name: 'Ariel Detergent 400g', sku: 'HSH-ARI-400', categoryId: 'cat-hsh', unit: 'pcs', costPrice: 900, sellingPrice: 1100, quantityInStock: 24, reorderLevel: 6, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-12', name: 'Sunlight Dishwash 500ml', sku: 'HSH-SUN-DW', categoryId: 'cat-hsh', unit: 'pcs', costPrice: 800, sellingPrice: 1000, quantityInStock: 18, reorderLevel: 5, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-13', name: 'Coke 50cl (PET)', sku: 'DRK-COK-50', categoryId: 'cat-drk', unit: 'bottle', costPrice: 220, sellingPrice: 300, quantityInStock: 72, reorderLevel: 24, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-14', name: 'Maltina (Classic) Can', sku: 'DRK-MLT-CAN', categoryId: 'cat-drk', unit: 'pcs', costPrice: 350, sellingPrice: 450, quantityInStock: 48, reorderLevel: 12, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'item-15', name: 'Amstel Malta Can', sku: 'DRK-AMS-CAN', categoryId: 'cat-drk', unit: 'pcs', costPrice: 380, sellingPrice: 500, quantityInStock: 48, reorderLevel: 12, allowFractional: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];

      const usersOffline = [
        { id: 'demo-admin-id', email: 'admin@demo.com', fullName: 'Shop Owner (Demo)', role: UserRole.ADMIN, createdAt: new Date().toISOString(), password: 'password123' },
        { id: 'demo-staff-id', email: 'salesperson@demo.com', fullName: 'Sales Staff (Demo)', role: UserRole.SALESPERSON, createdAt: new Date().toISOString(), password: 'password123' }
      ];

      window.localStorage.setItem('naija_shop_categories', JSON.stringify(categoriesOffline));
      window.localStorage.setItem('naija_shop_items', JSON.stringify(itemsOffline));
      window.localStorage.setItem('naija_shop_users', JSON.stringify(usersOffline));
      window.localStorage.setItem('naija_shop_offline_mode', 'true');

      results.users = 2;
      results.categories = categoriesOffline.length;
      results.items = itemsOffline.length;
      results.isOfflineSeeded = true;
      return results;
    } catch (localErr) {
      console.error('Offline local seed fallback failed:', localErr);
      results.errors.push(localErr.message || 'Seeding offline fallback failed');
      return results;
    }
  }
}