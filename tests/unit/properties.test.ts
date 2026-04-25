/**
 * Property & Listing Service Tests
 */

class PropertyService {
  constructor() {
    this.properties = [];
  }

  addProperty(property) {
    if (!property.title || !property.price || !property.location) {
      throw new Error('Property must have title, price, and location');
    }
    if (property.price < 0) {
      throw new Error('Price must be positive');
    }

    const newProperty = {
      id: `prop_${Date.now()}`,
      ...property,
      createdAt: new Date(),
      views: 0,
      favorites: 0,
    };
    
    this.properties.push(newProperty);
    return newProperty;
  }

  getProperty(id) {
    return this.properties.find(p => p.id === id);
  }

  updateProperty(id, updates) {
    const property = this.getProperty(id);
    if (!property) {
      throw new Error('Property not found');
    }

    if (updates.price !== undefined && updates.price < 0) {
      throw new Error('Price must be positive');
    }

    Object.assign(property, updates, { updatedAt: new Date() });
    return property;
  }

  deleteProperty(id) {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Property not found');
    }

    const [deleted] = this.properties.splice(index, 1);
    return deleted;
  }

  listProperties(filters = {}) {
    let results = this.properties;

    if (filters.minPrice) {
      results = results.filter(p => p.price >= filters.minPrice);
    }
    if (filters.maxPrice) {
      results = results.filter(p => p.price <= filters.maxPrice);
    }
    if (filters.location) {
      results = results.filter(p => 
        p.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    if (filters.type) {
      results = results.filter(p => p.type === filters.type);
    }

    return results;
  }

  incrementViews(id) {
    const property = this.getProperty(id);
    if (!property) {
      throw new Error('Property not found');
    }

    property.views += 1;
    return property;
  }

  incrementFavorites(id) {
    const property = this.getProperty(id);
    if (!property) {
      throw new Error('Property not found');
    }

    property.favorites += 1;
    return property;
  }
}

describe('Property Service', () => {
  let propertyService;

  beforeEach(() => {
    propertyService = new PropertyService();
  });

  describe('addProperty', () => {
    it('should add a valid property', () => {
      const property = {
        title: 'Beautiful 3-Bedroom Apartment',
        price: 250000,
        location: 'Lagos',
        type: 'apartment',
        bedrooms: 3,
        bathrooms: 2,
      };

      const added = propertyService.addProperty(property);

      expect(added.id).toBeDefined();
      expect(added.id).toMatch(/^prop_/);
      expect(added.title).toBe(property.title);
      expect(added.price).toBe(property.price);
      expect(added.createdAt).toBeDefined();
      expect(added.views).toBe(0);
      expect(added.favorites).toBe(0);
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        propertyService.addProperty({ title: 'Test' });
      }).toThrow('Property must have title, price, and location');

      expect(() => {
        propertyService.addProperty({ title: 'Test', price: 100 });
      }).toThrow('Property must have title, price, and location');
    });

    it('should throw error for negative price', () => {
      expect(() => {
        propertyService.addProperty({
          title: 'Test Property',
          price: -100,
          location: 'Lagos',
        });
      }).toThrow('Price must be positive');
    });
  });

  describe('getProperty', () => {
    it('should retrieve a property by id', () => {
      const property = propertyService.addProperty({
        title: 'Test Property',
        price: 500000,
        location: 'Lagos',
      });

      const retrieved = propertyService.getProperty(property.id);
      
      expect(retrieved).toEqual(property);
    });

    it('should return undefined for non-existent property', () => {
      const retrieved = propertyService.getProperty('non_existent');
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateProperty', () => {
    it('should update property fields', () => {
      const property = propertyService.addProperty({
        title: 'Original Title',
        price: 500000,
        location: 'Lagos',
      });

      const updated = propertyService.updateProperty(property.id, {
        title: 'Updated Title',
        price: 600000,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.price).toBe(600000);
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent property', () => {
      expect(() => {
        propertyService.updateProperty('non_existent', { title: 'Test' });
      }).toThrow('Property not found');
    });

    it('should throw error for negative price update', () => {
      const property = propertyService.addProperty({
        title: 'Test',
        price: 500000,
        location: 'Lagos',
      });

      expect(() => {
        propertyService.updateProperty(property.id, { price: -100 });
      }).toThrow('Price must be positive');
    });
  });

  describe('deleteProperty', () => {
    it('should delete a property', () => {
      const property = propertyService.addProperty({
        title: 'Test Property',
        price: 500000,
        location: 'Lagos',
      });

      const deleted = propertyService.deleteProperty(property.id);
      
      expect(deleted.id).toBe(property.id);
      expect(propertyService.getProperty(property.id)).toBeUndefined();
    });

    it('should throw error for non-existent property', () => {
      expect(() => {
        propertyService.deleteProperty('non_existent');
      }).toThrow('Property not found');
    });
  });

  describe('listProperties', () => {
    beforeEach(() => {
      propertyService.addProperty({
        title: 'Budget Apartment',
        price: 100000,
        location: 'Lagos',
        type: 'apartment',
      });
      propertyService.addProperty({
        title: 'Luxury Villa',
        price: 5000000,
        location: 'Lagos',
        type: 'villa',
      });
      propertyService.addProperty({
        title: 'Commercial Space',
        price: 2000000,
        location: 'Abuja',
        type: 'commercial',
      });
    });

    it('should list all properties when no filters applied', () => {
      const results = propertyService.listProperties();
      expect(results).toHaveLength(3);
    });

    it('should filter by minPrice', () => {
      const results = propertyService.listProperties({ minPrice: 500000 });
      expect(results).toHaveLength(2);
      expect(results.every(p => p.price >= 500000)).toBe(true);
    });

    it('should filter by maxPrice', () => {
      const results = propertyService.listProperties({ maxPrice: 500000 });
      expect(results).toHaveLength(2);
      expect(results.every(p => p.price <= 500000)).toBe(true);
    });

    it('should filter by location', () => {
      const results = propertyService.listProperties({ location: 'Lagos' });
      expect(results).toHaveLength(2);
      expect(results.every(p => p.location === 'Lagos')).toBe(true);
    });

    it('should filter by type', () => {
      const results = propertyService.listProperties({ type: 'apartment' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Budget Apartment');
    });

    it('should apply multiple filters', () => {
      const results = propertyService.listProperties({
        minPrice: 100000,
        maxPrice: 3000000,
        location: 'Lagos',
      });
      
      expect(results).toHaveLength(2);
    });
  });

  describe('incrementViews', () => {
    it('should increment property views', () => {
      const property = propertyService.addProperty({
        title: 'Test',
        price: 500000,
        location: 'Lagos',
      });

      expect(property.views).toBe(0);

      propertyService.incrementViews(property.id);
      const updated = propertyService.getProperty(property.id);
      
      expect(updated.views).toBe(1);
    });

    it('should throw error for non-existent property', () => {
      expect(() => {
        propertyService.incrementViews('non_existent');
      }).toThrow('Property not found');
    });
  });

  describe('incrementFavorites', () => {
    it('should increment property favorites', () => {
      const property = propertyService.addProperty({
        title: 'Test',
        price: 500000,
        location: 'Lagos',
      });

      propertyService.incrementFavorites(property.id);
      const updated = propertyService.getProperty(property.id);
      
      expect(updated.favorites).toBe(1);
    });
  });
});
