-- Seed dev data: 2 entities, dev-user, accountants, user_profile, invoice_number_sequence

-- Entity: SV
INSERT INTO entity (id, name, bank_name, bank_account, bank_routing, bank_swift, bank_iban, address_line_1, city, state, postal_code, country, tax_id, createdAt, updatedAt)
VALUES (
  'entity-sv',
  'SV Corp',
  'Silicon Valley Bank',
  '1234567890',
  '121140399',
  'SVBKUS6S',
  NULL,
  '3003 Tasman Dr',
  'Santa Clara',
  'CA',
  '95054',
  'US',
  'EIN 83-1234567',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Entity: LP
INSERT INTO entity (id, name, bank_name, bank_account, bank_routing, bank_swift, bank_iban, address_line_1, city, postal_code, country, tax_id, createdAt, updatedAt)
VALUES (
  'entity-lp',
  'LP Holdings',
  'Barclays Bank UK PLC',
  NULL,
  NULL,
  'BARCGB22',
  'GB29 BARC 2038 4729 1846 73',
  '1 Churchill Place',
  'London',
  'E14 5HP',
  'GB',
  'GB 284 7291 08',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Dev user (contractor in SV, prefix "JD")
INSERT INTO user (id, name, email, emailVerified, role, entityId, invoicePrefix, createdAt, updatedAt)
VALUES (
  'dev-user',
  'Dev User',
  'dev@localhost',
  1,
  'admin',
  'entity-sv',
  'JD',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Accountant 1 (SV)
INSERT INTO user (id, name, email, emailVerified, role, entityId, createdAt, updatedAt)
VALUES (
  'accountant-sv',
  'Alice Accountant',
  'alice@sv.test',
  1,
  'accountant',
  'entity-sv',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Accountant 2 (LP)
INSERT INTO user (id, name, email, emailVerified, role, entityId, createdAt, updatedAt)
VALUES (
  'accountant-lp',
  'Bob Bookkeeper',
  'bob@lp.test',
  1,
  'accountant',
  'entity-lp',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- User profile for dev-user
INSERT INTO user_profile (id, user_id, tax_id, address_line_1, city, state, postal_code, country, bank_name, bank_account, bank_routing, bank_swift, currency, createdAt, updatedAt)
VALUES (
  'profile-dev-user',
  'dev-user',
  'EIN 82-9876543',
  '42 Harbour Lane',
  'San Francisco',
  'CA',
  '94102',
  'US',
  'Silicon Valley Bank',
  '9876543210',
  '121140399',
  'SVBKUS6S',
  'USD',
  unixepoch() * 1000,
  unixepoch() * 1000
);

-- Invoice number sequence for dev-user (starts at 1)
INSERT INTO invoice_number_sequence (user_id, next_number)
VALUES ('dev-user', 1);
