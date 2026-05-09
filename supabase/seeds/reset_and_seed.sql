-- ============================================================
-- Reset + carga de carta de ejemplo
-- Vacía la carta del bar (categorías y productos) y la repuebla
-- con la carta de ejemplo. NO toca pedidos existentes — los
-- order_items mantienen sus datos snapshot (product_name, unit_price).
--
-- USO:
-- 1. Edita el v_bar_slug abajo con el slug de tu bar
-- 2. Ejecuta este script en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_bar_slug   TEXT := 'bar-manolo';   -- ← CAMBIA ESTO por tu slug
  v_bar_id     UUID;
  v_cat_bebidas    UUID;
  v_cat_tapas      UUID;
  v_cat_pintxos    UUID;
  v_cat_raciones   UUID;
  v_cat_bocadillos UUID;
  v_cat_postres    UUID;
  v_cat_cafes      UUID;
BEGIN
  SELECT id INTO v_bar_id FROM public.bars WHERE slug = v_bar_slug LIMIT 1;
  IF v_bar_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún bar con slug "%". Ajusta v_bar_slug.', v_bar_slug;
  END IF;

  -- Limpia carta existente (los pedidos antiguos se mantienen intactos)
  DELETE FROM public.products  WHERE bar_id = v_bar_id;
  DELETE FROM public.categories WHERE bar_id = v_bar_id;

  -- Categorías
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Bebidas', 1)
    RETURNING id INTO v_cat_bebidas;
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Tapas', 2)
    RETURNING id INTO v_cat_tapas;
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Pintxos', 3)
    RETURNING id INTO v_cat_pintxos;
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Raciones', 4)
    RETURNING id INTO v_cat_raciones;
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Bocadillos', 5)
    RETURNING id INTO v_cat_bocadillos;
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Postres', 6)
    RETURNING id INTO v_cat_postres;
  INSERT INTO public.categories (bar_id, name, sort_order) VALUES (v_bar_id, 'Cafés e infusiones', 7)
    RETURNING id INTO v_cat_cafes;

  -- Bebidas
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_bebidas, 'Caña',                'Cerveza de barril 200 ml',                    1.80, 1,  true, true),
    (v_bar_id, v_cat_bebidas, 'Doble',               'Cerveza de barril 400 ml',                    2.80, 2,  true, true),
    (v_bar_id, v_cat_bebidas, 'Cerveza sin alcohol', 'Botellín 250 ml',                             2.20, 3,  true, true),
    (v_bar_id, v_cat_bebidas, 'Tinto de verano',     'Vino tinto con gaseosa, hielo y limón',       2.80, 4,  true, true),
    (v_bar_id, v_cat_bebidas, 'Vino tinto',          'Copa de la casa',                             3.00, 5,  true, true),
    (v_bar_id, v_cat_bebidas, 'Vino blanco',         'Copa de la casa, frío',                       3.00, 6,  true, true),
    (v_bar_id, v_cat_bebidas, 'Sangría',             'Jarra 1 L con frutas de temporada',          12.00, 7,  true, true),
    (v_bar_id, v_cat_bebidas, 'Coca-Cola',           'Lata 33 cl',                                  2.20, 8,  true, true),
    (v_bar_id, v_cat_bebidas, 'Coca-Cola Zero',      'Lata 33 cl',                                  2.20, 9,  true, true),
    (v_bar_id, v_cat_bebidas, 'Fanta naranja',       'Lata 33 cl',                                  2.20, 10, true, true),
    (v_bar_id, v_cat_bebidas, 'Fanta limón',         'Lata 33 cl',                                  2.20, 11, true, true),
    (v_bar_id, v_cat_bebidas, 'Aquarius',            'Lata 33 cl',                                  2.20, 12, true, true),
    (v_bar_id, v_cat_bebidas, 'Agua mineral',        'Botella 50 cl',                               1.50, 13, true, true),
    (v_bar_id, v_cat_bebidas, 'Agua con gas',        'Botella 33 cl',                               1.80, 14, true, true);

  -- Tapas
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_tapas, 'Aceitunas aliñadas',     'Aceitunas verdes con especias',           1.80, 1, true, true),
    (v_bar_id, v_cat_tapas, 'Patatas bravas',         'Patata frita con salsa picante casera',   4.50, 2, true, true),
    (v_bar_id, v_cat_tapas, 'Croquetas caseras (6 u)','De jamón ibérico, fritura crujiente',     6.00, 3, true, true),
    (v_bar_id, v_cat_tapas, 'Tortilla de patata',     'Pincho generoso, jugosa por dentro',      3.50, 4, true, true),
    (v_bar_id, v_cat_tapas, 'Pan con tomate',         'Pan de cristal, tomate rallado y AOVE',   2.50, 5, true, true),
    (v_bar_id, v_cat_tapas, 'Boquerones en vinagre',  'Marinados con ajo y perejil',             5.50, 6, true, true),
    (v_bar_id, v_cat_tapas, 'Ensaladilla rusa',       'Receta de la casa con ventresca',         4.80, 7, true, true),
    (v_bar_id, v_cat_tapas, 'Pimientos de padrón',    'Salteados con sal gorda',                 6.00, 8, true, true);

  -- Pintxos (tradicionales del País Vasco)
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_pintxos, 'Gilda',                          'Aceituna, anchoa y guindilla en brocheta',                  2.50,  1, true, true),
    (v_bar_id, v_cat_pintxos, 'Tortilla de bacalao',            'Pincho clásico con bacalao desmigado',                      3.00,  2, true, true),
    (v_bar_id, v_cat_pintxos, 'Txangurro al horno',             'Centollo gratinado sobre pan tostado',                      4.50,  3, true, true),
    (v_bar_id, v_cat_pintxos, 'Huevo de codorniz y mojama',     'Sobre tostada con AOVE y escamas de sal',                   3.00,  4, true, true),
    (v_bar_id, v_cat_pintxos, 'Brocheta de gambas y piña',      'A la plancha con salsa de soja y miel',                     3.50,  5, true, true),
    (v_bar_id, v_cat_pintxos, 'Idiazábal con membrillo',        'Queso DO con dulce de membrillo y nuez',                    3.00,  6, true, true),
    (v_bar_id, v_cat_pintxos, 'Bacalao al pil-pil',             'Lomo en su salsa emulsionada con ajo y guindilla',          4.00,  7, true, true),
    (v_bar_id, v_cat_pintxos, 'Foie con manzana caramelizada',  'A la plancha con reducción de Pedro Ximénez',               4.50,  8, true, true),
    (v_bar_id, v_cat_pintxos, 'Carrillera al vino tinto',       'Ternera estofada con verduritas',                           4.00,  9, true, true),
    (v_bar_id, v_cat_pintxos, 'Bonito con piquillo',            'Bonito confitado sobre pimiento del piquillo asado',        3.50, 10, true, true);

  -- Raciones
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_raciones, 'Calamares a la romana',    'Anillas de calamar rebozadas, con limón',   12.00, 1, true, true),
    (v_bar_id, v_cat_raciones, 'Pulpo a la gallega',       'Cocido y servido con patata y pimentón',    15.00, 2, true, true),
    (v_bar_id, v_cat_raciones, 'Chipirones a la plancha',  'Con ajo, perejil y aceite de oliva',        14.00, 3, true, true),
    (v_bar_id, v_cat_raciones, 'Chorizo a la sidra',        'Cocido en sidra natural',                   8.50, 4, true, true),
    (v_bar_id, v_cat_raciones, 'Albóndigas en salsa',       'Caseras, con salsa de tomate y pimientos',  9.50, 5, true, true),
    (v_bar_id, v_cat_raciones, 'Jamón ibérico de bellota',  'Loncheado al momento, 80 g',                14.00, 6, true, true),
    (v_bar_id, v_cat_raciones, 'Tabla de quesos',           'Selección de tres quesos artesanos',        11.00, 7, true, true),
    (v_bar_id, v_cat_raciones, 'Pisto manchego',            'Tradicional con huevo poché',                7.50, 8, true, true);

  -- Bocadillos
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_bocadillos, 'Bocadillo de jamón serrano', 'Pan de hogaza con tomate',             5.00, 1, true, true),
    (v_bar_id, v_cat_bocadillos, 'Bocadillo de calamares',     'Clásico madrileño con limón',          6.00, 2, true, true),
    (v_bar_id, v_cat_bocadillos, 'Bocadillo de tortilla',      'Pan recién horneado, tortilla jugosa', 4.50, 3, true, true),
    (v_bar_id, v_cat_bocadillos, 'Bocadillo de lomo y queso',  'Lomo a la plancha y queso fundido',    5.50, 4, true, true),
    (v_bar_id, v_cat_bocadillos, 'Bocadillo de panceta',       'Crujiente, con AOVE y sal',            5.00, 5, true, true);

  -- Postres
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_postres, 'Tarta de queso casera',    'Cremosa por dentro, dorada por fuera',         5.00, 1, true, true),
    (v_bar_id, v_cat_postres, 'Flan de huevo',            'Hecho en casa, con caramelo',                  4.00, 2, true, true),
    (v_bar_id, v_cat_postres, 'Arroz con leche',          'Cremoso, con canela',                          4.00, 3, true, true),
    (v_bar_id, v_cat_postres, 'Helado (3 bolas)',         'Vainilla, chocolate o fresa',                  4.50, 4, true, true),
    (v_bar_id, v_cat_postres, 'Tarta de manzana',         'Templada, con bola de helado',                 4.50, 5, true, true);

  -- Cafés e infusiones
  INSERT INTO public.products (bar_id, category_id, name, description, price, sort_order, in_stock, is_active) VALUES
    (v_bar_id, v_cat_cafes, 'Café solo',         'Espresso',                                        1.30, 1, true, true),
    (v_bar_id, v_cat_cafes, 'Café cortado',      'Espresso con un toque de leche',                  1.40, 2, true, true),
    (v_bar_id, v_cat_cafes, 'Café con leche',    'En vaso o taza',                                  1.60, 3, true, true),
    (v_bar_id, v_cat_cafes, 'Café americano',    'Espresso largo de agua',                          1.80, 4, true, true),
    (v_bar_id, v_cat_cafes, 'Carajillo',         'Café con un chorro de licor',                     2.50, 5, true, true),
    (v_bar_id, v_cat_cafes, 'Té (varios)',       'Verde, rojo, manzanilla o poleo',                 2.00, 6, true, true),
    (v_bar_id, v_cat_cafes, 'Infusión',          'Tila, menta, melisa o relax',                     2.00, 7, true, true);

  RAISE NOTICE 'Carta reseteada en bar "%": 6 categorías y % productos.',
    v_bar_slug, (SELECT count(*) FROM public.products WHERE bar_id = v_bar_id);
END $$;
