// 10-mongo-init.js
(function () {
  function log(msg) { print("[init] " + msg); }
  function safe(fn, desc) {
    try { fn(); log("OK: " + desc); }
    catch (e) { log("WARN: " + desc + " -> " + e.message); }
  }

  var dbname = "bookingsdb";
  db = db.getSiblingDB(dbname);
  log("Usando DB " + dbname);

  // --- bookings (validador compatible con tus datos) ---
  if (!db.getCollectionNames().includes("bookings")) {
    safe(function () {
      db.createCollection("bookings", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["_id","showtime_id","movie_id","created_at","status","price_total","currency"],
            properties: {
              _id: { bsonType: ["string","objectId"] },
              showtime_id: { bsonType: "string" },
              movie_id: { bsonType: "string" },
              cinema_id: { bsonType: "string" },
              sala_id: { bsonType: "string" },
              sala_number: { bsonType: ["int","long","double"] },
              seats: {
                bsonType: "array",
                items: {
                  bsonType: "object",
                  required: ["seat_row","seat_number"],
                  properties: {
                    seat_row: { bsonType: "string" },
                    seat_number: { bsonType: ["int","long","double"] }
                  }
                }
              },
              user: {
                bsonType: "object",
                required: ["user_id","name","email"],
                properties: {
                  user_id: { bsonType: "string" },
                  name: { bsonType: "string" },
                  email: { bsonType: "string" }
                }
              },
              payment_method: { bsonType: ["string","null"], enum: ["card","cash","yape","plin","stripe",null] },
              source: { bsonType: ["string","null"], enum: ["web","mobile","kiosk","partner",null] },
              status: { bsonType: "string", enum: ["CONFIRMED","CANCELLED","PENDING","REFUNDED"] },
              price_total: { bsonType: ["double","int","long","decimal"] },
              currency: { bsonType: "string" },
              created_at: { bsonType: ["date","string"] }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "error"
      });
    }, "createCollection('bookings')");
  } else {
    log("Colección 'bookings' ya existe");
  }

  // Índices
  var B = db.bookings;
  safe(_=>B.createIndex({ created_at: -1 }), "idx bookings.created_at");
  safe(_=>B.createIndex({ status: 1, source: 1, created_at: -1 }), "idx bookings status/source/date");
  safe(_=>B.createIndex({ movie_id: 1, created_at: -1 }), "idx bookings movie/date");
  safe(_=>B.createIndex({ cinema_id: 1, sala_id: 1, created_at: -1 }), "idx bookings cinema/sala/date");
  safe(_=>B.createIndex({ "user.user_id": 1 }), "idx bookings user.user_id");
  safe(_=>B.createIndex({ "user.email": 1 }, { collation: { locale: "es", strength: 1 } }), "idx bookings user.email (collation)");
  safe(_=>B.createIndex({ showtime_id: 1 }), "idx bookings.showtime_id");

  // Anti doble-venta: único por (showtime_id, seat_row, seat_number) cuando está CONFIRMED.
  safe(_=>B.createIndex(
    { showtime_id: 1, "seats.seat_row": 1, "seats.seat_number": 1 },
    { unique: true, partialFilterExpression: { status: "CONFIRMED" } }
  ), "unique seats por showtime (CONFIRMED)");

  // Vista de lectura con campos derivados
  safe(_=>db.bookings_v && db.bookings_v.drop(), "drop view bookings_v (si existía)");
  safe(function () {
    db.createView("bookings_v", "bookings", [
      {
        $addFields: {
          created_at_dt: {
            $cond: [
              { $eq: [ { $type: "$created_at" }, "date" ] },
              "$created_at",
              { $dateFromString: { dateString: "$created_at" } }
            ]
          },
          created_at_pe: {
            $cond: [
              { $eq: [ { $type: "$created_at" }, "date" ] },
              "$created_at",
              { $dateFromString: { dateString: "$created_at", timezone: "America/Lima" } }
            ]
          },
          seat_count: { $size: { $ifNull: ["$seats", []] } },
          email_norm: { $toLower: "$user.email" }
        }
      }
    ]);
  }, "createView('bookings_v')");

  // Colección materializada inicial (si ya hubiera datos)
  safe(function () {
    db.bookings.aggregate([
      {
        $addFields: {
          created_at_dt: {
            $cond: [
              { $eq: [ { $type: "$created_at" }, "date" ] },
              "$created_at",
              { $dateFromString: { dateString: "$created_at" } }
            ]
          },
          created_at_pe: {
            $cond: [
              { $eq: [ { $type: "$created_at" }, "date" ] },
              "$created_at",
              { $dateFromString: { dateString: "$created_at", timezone: "America/Lima" } }
            ]
          },
          seat_count: { $size: { $ifNull: ["$seats", []] } },
          email_norm: { $toLower: "$user.email" }
        }
      },
      { $merge: { into: "bookings_mat", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }
    ]);
  }, "materialize -> bookings_mat");

  var M = db.bookings_mat;
  safe(_=>M.createIndex({ created_at_dt: -1 }), "idx bookings_mat.created_at_dt");
  safe(_=>M.createIndex({ status: 1, source: 1, created_at_dt: -1 }), "idx bookings_mat status/source/date");
  safe(_=>M.createIndex({ movie_id: 1, created_at_dt: -1 }), "idx bookings_mat movie/date");
  safe(_=>M.createIndex({ cinema_id: 1, sala_id: 1, created_at_dt: -1 }), "idx bookings_mat cinema/sala/date");
  safe(_=>M.createIndex({ email_norm: 1 }, { collation: { locale: "es", strength: 1 } }), "idx bookings_mat email_norm");

  log("Init de bookings completo.");
})();
