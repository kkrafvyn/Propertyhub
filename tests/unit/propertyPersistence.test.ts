import {
  serializePropertyForCreate,
  serializePropertyForUpdate,
} from '../../src/utils/propertyPersistence';

describe('propertyPersistence', () => {
  it('serializes a property into the Supabase property row shape', () => {
    const payload = serializePropertyForCreate(
      {
        id: 'draft-1',
        title: 'Airport View Apartment',
        description: 'Modern home close to the airport.',
        type: 'apartment',
        listingType: 'rent',
        status: 'available',
        pricing: {
          amount: 3200,
          currency: 'GHS',
          period: 'monthly',
          negotiable: true,
        },
        location: {
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana',
          coordinates: { lat: 5.6037, lng: -0.187 },
        },
        features: {
          area: 140,
          bedrooms: 3,
          bathrooms: 2,
        },
        amenities: ['WiFi', 'Parking'],
        media: [
          {
            id: 'media-1',
            url: 'https://example.com/home.jpg',
            type: 'image',
            order: 0,
          },
        ],
        ownerId: 'owner-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        views: 10,
        favorites: 4,
        inquiries: 2,
        tags: ['featured'],
      },
      'owner-1',
    );

    expect(payload.owner_id).toBe('owner-1');
    expect(payload.listing_type).toBe('rent');
    expect(payload.price).toBe(3200);
    expect(payload.currency).toBe('GHS');
    expect(payload.location).toContain('Accra');
    expect(payload.latitude).toBe(5.6037);
    expect(payload.longitude).toBe(-0.187);
    expect(payload.images).toEqual(['https://example.com/home.jpg']);
    expect(payload.cover_image).toBe('https://example.com/home.jpg');
    expect(payload.bedrooms).toBe(3);
    expect(payload.bathrooms).toBe(2);
    expect(payload.area).toBe(140);
  });

  it('serializes partial property updates without forcing unrelated fields', () => {
    const payload = serializePropertyForUpdate({
      available: false,
      featured: true,
      pricing: {
        amount: 4500,
        currency: 'USD',
        negotiable: false,
      },
    });

    expect(payload.status).toBe('maintenance');
    expect(payload.featured).toBe(true);
    expect(payload.price).toBe(4500);
    expect(payload.currency).toBe('USD');
    expect(payload.title).toBeUndefined();
    expect(payload.location).toBeUndefined();
  });
});
