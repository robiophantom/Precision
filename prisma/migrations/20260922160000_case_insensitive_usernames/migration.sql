-- Enforce uniqueness regardless of username letter casing.
CREATE UNIQUE INDEX "User_username_lower_key" ON "User"(LOWER("username"));
