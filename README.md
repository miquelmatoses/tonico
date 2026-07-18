# Tonico — el planter de Puchades

Sistema expert de gestió estratègica per a **Hattrick**. Regles deterministes,
res d'IA. Puges les dades de la setmana i l'app et diu què fer.

> Repositori **públic**. Cap dada real de jugadors ni cap secret ací dins:
> les dades viuen a D1, els secrets a variables d'entorn de Cloudflare.

## Estat: Fase 0 completa

Esquelet + ingesta CSV → D1, login, i18n i les tres primeres pantalles.
Provat d'extrem a extrem amb `wrangler pages dev` i D1 local.

## Estructura

    schema/        Esquema D1 (001) + data llavor: calendari, constants (002)
    lib/           Lògica pura i compartida (sense dependències)
      adaptador.js   CSV → model intern (l'únic mòdul que coneix el CSV)
      calendari.js   Temporada/setmana des de l'àncora (constants_joc)
      diferencia.js  Nous / recompra / desapareguts entre instantànies
      auth.js        PBKDF2 + sessió signada (WebCrypto natiu)
    functions/     Cloudflare Pages Functions (API JSON sota /api/*)
      _middleware.js Porta d'autorització (valida sessió, filtra per usuari)
      api/*.js       registre, entrar, eixir, sessio, equips, pujar, instantanies
    public/        HTML semàntic estàtic + client (comu.js) + i18n + estil.css
                   (registre, entrada, onboarding d'equips, pujada, instantànies)
    data/fixtures/ CSV ANONIMITZATS (mateix format, noms/IDs inventats)
    scripts/       crea-usuari.mjs (EINA D'ADMIN d'emergència, fora del flux)
    test/          Proves (node natiu, sense framework)

## Proves

    node test/proves.mjs       # adaptador, calendari, diferència
    node test/integracio.mjs   # persistència real vs SQLite en memòria
    node test/auth.mjs         # hash i sessió
    node test/flux.mjs         # registre → onboarding → pujada → llista (+ gates)

## Desenvolupament local

    # 1. Secret de sessió per a dev (gitignored)
    echo 'SESSIO_SECRET=el-que-vulgues' > .dev.vars
    # 2. Esquema + llavor a la D1 local
    npx wrangler d1 execute tonico --local --file schema/001_esquema.sql
    npx wrangler d1 execute tonico --local --file schema/002_llavor.sql
    # 3. Usuari (la contrasenya no s'escriu enlloc, només el seu hash)
    node scripts/crea-usuari.mjs jo@exemple.cat 'clau' Benifotrem Fotrem > /tmp/u.sql
    npx wrangler d1 execute tonico --local --file /tmp/u.sql
    # 4. Servir
    npx wrangler pages dev public

## Registre

El registre és **obert** per la web (`/registre`): correu + contrasenya, i
s'inicia sessió directament. Després, si l'usuari no té equips, l'**onboarding**
demana el nom del primer equip i del juvenil abans de deixar pujar dades.

## Desplegament (Bloc E — Cloudflare)

1. Crear la base: `npx wrangler d1 create tonico` → copiar el `database_id`
   dins `wrangler.toml`.
2. Aplicar esquema i llavor amb `--remote` en lloc de `--local`.
3. Secret de sessió: `npx wrangler pages secret put SESSIO_SECRET`.
4. Connectar el repo de GitHub al projecte de Pages (build output: `public`).
5. Obrir la web i **registrar-se** (no cal seed d'usuari).

## Decisions obertes

- **Verificació de correu**: estructura preparada (camps `correu_verificat`,
  taula `tokens_verificacio`, interruptor `registre_verificacio_activa` a
  `configuracio_app`, ara `false`). Activar-la requerix un **proveïdor de
  correu extern** (p.ex. Resend): implementar `enviarCorreuVerificacio` a
  `lib/verificacio.js` (ara és un stub) i un endpoint de confirmació de token.
