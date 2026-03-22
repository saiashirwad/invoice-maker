-- Add a regular contractor (user role) for dev testing
INSERT INTO user (id, name, email, emailVerified, role, entityId, invoicePrefix, createdAt, updatedAt)
VALUES (
  'dev-contractor',
  'Jane Contractor',
  'jane@localhost',
  1,
  'user',
  'entity-sv',
  'JC',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Profile for contractor
INSERT INTO user_profile (id, user_id, tax_id, address_line_1, city, state, postal_code, country, bank_name, bank_account, bank_routing, bank_swift, currency, createdAt, updatedAt)
VALUES (
  'profile-dev-contractor',
  'dev-contractor',
  'EIN 82-5551234',
  '100 Main Street',
  'San Francisco',
  'CA',
  '94105',
  'US',
  'Chase Bank',
  '5551234567',
  '021000021',
  'CHASUS33',
  'USD',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Invoice number sequence for contractor
INSERT INTO invoice_number_sequence (user_id, next_number)
VALUES ('dev-contractor', 1);
