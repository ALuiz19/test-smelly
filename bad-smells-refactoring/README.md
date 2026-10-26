# Detecção de Bad Smells e Refatoração Segura

Trabalho prático sobre Bad Smells e refatoração. Projeto-base: [CleitonSilvaT/bad-smells-js-refactoring](https://github.com/CleitonSilvaT/bad-smells-js-refactoring).

## Estrutura

| Arquivo | Descrição |
| --- | --- |
| `src/ReportGenerator.js` | Código original, com os smells (não modificado) |
| `src/ReportGenerator.refactored.js` | Versão refatorada |
| `__tests__/ReportGenerator.test.js` | Suíte original (rede de segurança, não modificada) |
| `__tests__/ReportGenerator.refactored.test.js` | Cópia da suíte; só o `import` muda |
| `.eslintrc.json` | ESLint + `eslint-plugin-sonarjs` |
| `docs/analise-manual.md` | Etapa 2: smells encontrados e comparação com a ferramenta |
| `docs/eslint-antes.*` / `docs/eslint-depois.txt` | Saídas do ESLint antes e depois |
| `docs/testes-execucao.txt` | Saída do `npm test` |

## Como rodar

```bash
cd bad-smells-refactoring
npm install
npm test                                       # roda as duas suítes
npx eslint src/ReportGenerator.js              # antes: 2 erros (complexidade cognitiva 27)
npx eslint src/ReportGenerator.refactored.js   # depois: nenhum erro
```

O projeto usa ES Modules sem Babel, por isso o script `test` roda o Jest com `node --experimental-vm-modules` (com `npx jest` direto a suíte falha com `Cannot use import statement outside a module`).

## Resultados

- **ESLint:** de 2 erros (`sonarjs/cognitive-complexity` 27/15 e `sonarjs/no-collapsible-if`) para 0.
- **Testes:** a versão refatorada passa em 5/5. O arquivo original passa em 4/5: o teste HTML do Admin falha por um bug do próprio original (gera `<tr >` com espaço). Detalhes em `docs/analise-manual.md`, seção 6.

## Refatorações aplicadas

- **Replace Conditional with Polymorphism:** `CsvFormatter` e `HtmlFormatter` (cabeçalho, linha, rodapé) substituem os quatro `if (reportType === ...)`. `AdminPolicy`, `StandardUserPolicy` e `NoAccessPolicy` substituem os `if (user.role === ...)`.
- **Extract Method:** filtragem, soma do total (`sumValues`) e formatação ficam separadas.
- **Remove Duplicated Code:** a linha de cada formato e o `total +=` existem em um só lugar.
- **Replace Magic Number with Symbolic Constant:** `ADMIN_PRIORITY_THRESHOLD` e `USER_MAX_VISIBLE_VALUE`.
