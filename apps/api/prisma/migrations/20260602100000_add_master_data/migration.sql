-- CreateEnum
CREATE TYPE "MasterCategoryType" AS ENUM ('product', 'service', 'design', 'general');

-- CreateTable: master_categories
CREATE TABLE "master_categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "type" "MasterCategoryType" NOT NULL DEFAULT 'general',
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: master_brands
CREATE TABLE "master_brands" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable: countries
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "iso_code" VARCHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "dial_code" VARCHAR(5) NOT NULL,
    "flag" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 999,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: departments
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cities
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso_code_key" ON "countries"("iso_code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_country_id_code_key" ON "departments"("country_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cities_department_id_code_key" ON "cities"("department_id", "code");

-- CreateIndex
CREATE INDEX "cities_department_id_idx" ON "cities"("department_id");

-- CreateIndex
CREATE INDEX "master_categories_type_is_active_idx" ON "master_categories"("type", "is_active");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
