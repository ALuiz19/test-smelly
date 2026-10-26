# Análise manual dos Bad Smells (Etapa 2)

Arquivo analisado: `src/ReportGenerator.js` (68 linhas, um único método público `generateReport`).

Fiz esta leitura antes de rodar o ESLint, para depois comparar o que encontrei com o que a ferramenta aponta. Para cada smell anotei o nome usado no catálogo do Fowler, o trecho, por que é problemático e qual técnica de refatoração resolve.

---

## 1. Long Method (Método Longo) — linhas 11–67

`generateReport` faz tudo sozinho: monta o cabeçalho, filtra os itens por perfil, marca prioridade, formata cada linha, soma o total e monta o rodapé. São cerca de 55 linhas com três seções separadas só por comentários (`// --- Seção do Cabeçalho ---`, `// --- Seção do Corpo ---`, `// --- Seção do Rodapé ---`).

- **Por que é problemático para a manutenção:** para mudar qualquer detalhe (ex.: o rodapé do HTML) é preciso entender o método inteiro. Os comentários de seção são um sinal clássico de que ali deveriam existir métodos separados.
- **Por que é problemático para os testes:** não dá para testar a regra de visibilidade ou a formatação de uma linha isoladamente; todo teste precisa passar pelo método inteiro e verificar a string final.
- **Técnica:** Extract Method / Extract Class.

## 2. Switch Statements / Condicionais aninhadas (Complexidade alta) — linhas 16, 28–54, 58

A mesma pergunta `reportType === 'CSV' / 'HTML'` é feita **quatro vezes** (cabeçalho, corpo do ADMIN, corpo do USER, rodapé), e `user.role === 'ADMIN' / 'USER'` fica no meio, criando até 4 níveis de aninhamento (`for` → `if role` → `if value` → `if reportType`).

- **Por que é problemático para a manutenção:** adicionar um formato novo (ex.: JSON) ou um perfil novo (ex.: GERENTE) exige mexer em vários pontos do mesmo método (Shotgun Surgery dentro de uma função). É fácil esquecer um dos ramos.
- **Por que é problemático para os testes:** o número de caminhos cresce como formatos × perfis × faixas de valor; cada combinação nova precisa de um teste próprio.
- **Técnica:** Replace Conditional with Polymorphism (uma classe por formato e uma política por perfil) e Decompose Conditional.

## 3. Duplicated Code (Código Duplicado) — linhas 35–41 e 46–52

A linha CSV `${item.id},${item.name},${item.value},${user.name}` aparece igual nos ramos de ADMIN e USER. A linha HTML é quase igual nos dois ramos (só muda o `style`). `total += item.value` aparece **quatro vezes**.

- **Por que é problemático para a manutenção:** uma mudança no layout da linha precisa ser feita em dois lugares; se alguém esquecer um, ADMIN e USER passam a gerar relatórios diferentes sem motivo.
- **Por que é problemático para os testes:** a duplicação esconde diferenças sutis. Foi exatamente o que aconteceu aqui (ver smell 6): o ramo HTML do ADMIN gera `<tr >` e o do USER gera `<tr>`.
- **Técnica:** Extract Method (formatação da linha em um só lugar) e cálculo do total separado da formatação.

## 4. Magic Numbers / Magic Strings — linhas 30 e 45

`1000` (limite de prioridade do admin) e `500` (valor máximo visível para usuário comum) aparecem soltos, sem nome. Os papéis `'ADMIN'`/`'USER'` e os formatos `'CSV'`/`'HTML'` também são strings repetidas.

- **Por que é problemático:** quem lê o código precisa adivinhar o significado do número; se a regra mudar, é preciso caçar todas as ocorrências. Nos testes, os valores de borda (500, 501, 1000, 1001) não ficam evidentes.
- **Técnica:** Replace Magic Number with Symbolic Constant.

## 5. Efeito colateral escondido (Side Effect) — linha 32

`item.priority = true` altera o objeto recebido como parâmetro. Quem chama `generateReport` não espera que gerar um relatório modifique os seus dados. Os testes do projeto até se protegem disso com `JSON.parse(JSON.stringify(testItems))` em todo cenário.

- **Técnica:** neste trabalho mantive o efeito no arquivo refatorado (refatorar não deve mudar comportamento), mas deixei-o isolado e comentado em `AdminPolicy.prepare`. Removê-lo seria uma mudança de comportamento a ser decidida à parte.

## 6. Observação: bug latente no código original — linha 40

```js
const style = item.priority ? 'style="font-weight:bold;"' : '';
report += `<tr ${style}>...`;
```

Quando o item **não** é prioritário, a saída fica `<tr ><td>...` (com um espaço sobrando). O teste `deve gerar um relatório HTML completo para Admin (com prioridade)` espera `<tr><td>1</td>...` e por isso **falha no arquivo original** (4 de 5 testes passam). É consequência direta do smell 3: o ramo do USER, que foi escrito separadamente, gera `<tr>` corretamente.

Como os testes não podem ser alterados, eles são a especificação: a versão refatorada gera `<tr>` sem espaço e passa nos 5 testes.

---

## Comparação com o ESLint + SonarJS (Etapa 4)

Saída completa em `docs/eslint-antes.txt` (print em `docs/eslint-antes.png`):

| Problema | Análise manual | ESLint/SonarJS |
| --- | --- | --- |
| Método longo / complexidade alta | Sim (smells 1 e 2) | Sim: `sonarjs/cognitive-complexity`, **27** (limite 15) |
| `if` aninhado que poderia ser unido (linhas 43–45) | Não percebi | Sim: `sonarjs/no-collapsible-if` |
| Código duplicado dentro do método | Sim (smell 3) | Não: `no-identical-functions` só compara funções inteiras |
| Números mágicos 500 / 1000 | Sim (smell 4) | Não (o preset recomendado não tem essa regra) |
| Mutação do parâmetro | Sim (smell 5) | Não |
| `<tr >` com espaço | Sim (6), achado pelo teste | Não |

O que a ferramenta acrescentou: um **número objetivo** para a complexidade (27, quase o dobro do limite), que transforma a impressão de "método confuso" em uma meta verificável. Também apontou o `if` colapsável, que passei sem notar na leitura. Por outro lado, a duplicação dentro do mesmo método, os números mágicos e o efeito colateral só apareceram na leitura manual, então as duas análises se complementam.
