-- ============================================================
-- Añade la categoría "Pintxos" con 10 pintxos típicos del País Vasco.
-- Idempotente: si ya existe la categoría no la duplica, y solo
-- inserta los pintxos que aún no estén creados (compara por nombre).
--
-- USO:
-- 1. Edita el v_bar_slug si tu bar no es 'bar-manolo'
-- 2. Ejecuta en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_bar_slug TEXT := 'bar-manolo';
  v_bar_id   UUID;
  v_cat_id   UUID;
BEGIN
  SELECT id INTO v_bar_id FROM public.bars WHERE slug = v_bar_slug LIMIT 1;
  IF v_bar_id IS NULL THEN
    RAISE EXCEPTION 'Bar "%" no encontrado.', v_bar_slug;
  END IF;

  -- Crea la categoría solo si no existe
  SELECT id INTO v_cat_id
  FROM public.categories
  WHERE bar_id = v_bar_id AND name = 'Pintxos'
  LIMIT 1;

  IF v_cat_id IS NULL THEN
    -- sort_order 2.5 para que aparezca entre Tapas y Raciones
    INSERT INTO public.categories (bar_id, name, sort_order)
    VALUES (v_bar_id, 'Pintxos', 3)
    RETURNING id INTO v_cat_id;
    -- Reordeno categorías existentes para que Pintxos quede entre Tapas y Raciones
    UPDATE public.categories SET sort_order = sort_order + 1
    WHERE bar_id = v_bar_id AND sort_order >= 3 AND id <> v_cat_id;
    UPDATE public.categories SET sort_order = 3
    WHERE id = v_cat_id;
  END IF;

  -- Inserta solo los pintxos que aún no estén
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active)
  SELECT * FROM (VALUES
    (v_bar_id, v_cat_id, 'Gilda',                          'Aceituna, anchoa y guindilla en brocheta',                  2.50,  1, true, true),
    (v_bar_id, v_cat_id, 'Tortilla de bacalao',            'Pincho clásico con bacalao desmigado',                      3.00,  2, true, true),
    (v_bar_id, v_cat_id, 'Txangurro al horno',             'Centollo gratinado sobre pan tostado',                      4.50,  3, true, true),
    (v_bar_id, v_cat_id, 'Huevo de codorniz y mojama',     'Sobre tostada con AOVE y escamas de sal',                   3.00,  4, true, true),
    (v_bar_id, v_cat_id, 'Brocheta de gambas y piña',      'A la plancha con salsa de soja y miel',                     3.50,  5, true, true),
    (v_bar_id, v_cat_id, 'Idiazábal con membrillo',        'Queso DO con dulce de membrillo y nuez',                    3.00,  6, true, true),
    (v_bar_id, v_cat_id, 'Bacalao al pil-pil',             'Lomo en su salsa emulsionada con ajo y guindilla',          4.00,  7, true, true),
    (v_bar_id, v_cat_id, 'Foie con manzana caramelizada',  'A la plancha con reducción de Pedro Ximénez',               4.50,  8, true, true),
    (v_bar_id, v_cat_id, 'Carrillera al vino tinto',       'Ternera estofada con verduritas',                           4.00,  9, true, true),
    (v_bar_id, v_cat_id, 'Bonito con piquillo',            'Bonito confitado sobre pimiento del piquillo asado',        3.50, 10, true, true)
  ) AS new_pintxos(bar_id, category_id, name, description, price, sort_order, in_stock, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.bar_id = new_pintxos.bar_id
      AND p.name = new_pintxos.name
  );

  RAISE NOTICE 'Categoría "Pintxos" lista en bar "%": % productos en total.',
    v_bar_slug,
    (SELECT count(*) FROM public.products WHERE category_id = v_cat_id);
END $$;
