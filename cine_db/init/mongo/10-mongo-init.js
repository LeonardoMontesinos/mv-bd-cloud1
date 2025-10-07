db = db.getSiblingDB("bookingsdb");

db.createCollection("bookings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "showtime_id", "movie_id", "created_at", "status", "price_total", "currency"],
      properties: {
        _id: { bsonType: ["string", "objectId"] },
        showtime_id: { bsonType: "string" },
        movie_id: { bsonType: "string" },
        cinema_id: { bsonType: "string" },
        sala_id: { bsonType: "string" },
        sala_number: { bsonType: ["int", "long", "double"] },
        seats: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["seat_row", "seat_number"],
            properties: {
              seat_row: { bsonType: "string" },
              seat_number: { bsonType: ["int", "long", "double"] }
            }
          }
        },
        user: {
          bsonType: "object",
          required: ["user_id", "name", "email"],
          properties: {
            user_id: { bsonType: "string" },
            name: { bsonType: "string" },
            email: { bsonType: "string" }
          }
        },
        payment_method: {
          bsonType: ["string", "null"],
          enum: ["card", "cash", "yape", "plin", "stripe", null]
        },
        source: {
          bsonType: ["string", "null"],
          enum: ["web", "mobile", "kiosk", "partner", null]
        },
        status: { bsonType: "string", enum: ["CONFIRMED", "CANCELLED", "REFUNDED"] },
        price_total: { bsonType: ["double", "int", "long", "decimal"] },
        currency: { bsonType: "string" },
        created_at: { bsonType: ["date", "string"] }
      }
    }
  },
  validationLevel: "moderate"
});

// índices útiles (sin tocar _id)
db.bookings.createIndex({ showtime_id: 1 });
db.bookings.createIndex({ movie_id: 1 });
db.bookings.createIndex({ "user.user_id": 1 });
db.bookings.createIndex({ created_at: -1 });
