-- Tonico — migració 074 · un valor mal col·locat a `taula_salaris`.
--
-- A la guia (§8) la fila «Divine» té la columna Defending BUIDA, i el 129.150 € que hi ha a la
-- seua dreta és el de PLAYMAKING. En muntar la taula, la cel·la buida va desplaçar la columna i
-- eixe valor va acabar com a `defensa` nivell 16. La `creativitat`, mentrestant, es quedava
-- sense el seu Diví.
--
-- Efecte pràctic: cap a nivells jugables (parlem d'un defensa Diví). Però és un valor fals a la
-- font de veritat de la qual penja tot el PAS 4, i el `DECISIONS.md` fins i tot deia
-- «creativitat i anotació no publiquen el 16» sense adonar-se que defensa tampoc.
--
-- ESCALA, per a qui llija açò: el nivell de Tonico compta des d'on el sou deixa de ser el mínim.
--   nivell Tonico 1 = «Insuficient» de Hattrick (HT 5)  →  nivell Tonico n = HT n+4
UPDATE constants_joc
   SET valor = json_set(
         json_remove(valor, '$.defensa."16"'),
         '$.creativitat."16"', 129150)
 WHERE clau = 'taula_salaris';
