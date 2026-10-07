# Análise manual dos Test Smells (Etapa 2)

Arquivo analisado: `test/userService.smelly.test.js`. O enunciado fala em `__tests__/`, mas neste repositório a pasta de testes é `test/`.

Fiz esta leitura antes de rodar o ESLint, para depois comparar o que eu encontrei com o que a ferramenta aponta. Para cada teste anotei o smell com o nome usado na literatura, o trecho, por que é um mau cheiro e qual o risco.

---

## 1. `deve criar e buscar um usuário corretamente` (linhas 18–31)

**Smell:** Eager Test + Assertion Roulette

```js
// Act 1: Criar
const usuarioCriado = userService.createUser(/* ... */);
expect(usuarioCriado.id).toBeDefined();

// Act 2: Buscar
const usuarioBuscado = userService.getUserById(usuarioCriado.id);
expect(usuarioBuscado.nome).toBe(dadosUsuarioPadrao.nome);
expect(usuarioBuscado.status).toBe('ativo');
```

- **Por que é mau cheiro:** o teste verifica dois comportamentos diferentes (criar e buscar), com dois Acts e três asserts misturados entre eles. Os próprios comentários "Act 1" e "Act 2" já mostram isso.
- **Risco:** quando falha, não dá para saber de imediato qual comportamento quebrou. Uma falha no primeiro `expect` também esconde o resultado dos outros.

## 2. `deve desativar usuários se eles não forem administradores` (linhas 33–52)

**Smell:** Conditional Test Logic

```js
for (const user of todosOsUsuarios) {
  const resultado = userService.deactivateUser(user.id);
  if (!user.isAdmin) {
    expect(resultado).toBe(true);          // linha 44
    // ...
    expect(usuarioAtualizado.status).toBe('inativo'); // linha 46
  } else {
    expect(resultado).toBe(false);         // linha 49
  }
}
```

- **Por que é mau cheiro:** o caminho que o teste percorre depende dos dados. O teste vira um pequeno programa, com laço e desvio, que também precisaria ser testado.
- **Risco:** parte dos `expect` pode nunca rodar. Por exemplo, se `createUser` passar a ignorar o parâmetro `isAdmin`, o admin cai no ramo do usuário comum, o `else` nunca executa e o teste continua verde. Também fica difícil saber qual iteração falhou. São dois comportamentos (usuário comum e administrador) num só teste.

## 3. `deve gerar um relatório de usuários formatado` (linhas 54–64)

**Smell:** Fragile Test / Sensitive Equality

```js
const linhaEsperada = `ID: ${usuario1.id}, Nome: Alice, Status: ativo\n`;
expect(relatorio).toContain(linhaEsperada);
expect(relatorio.startsWith('--- Relatório de Usuários ---')).toBe(true);
```

- **Por que é mau cheiro:** o teste compara a linha formatada exata e o cabeçalho literal, inclusive os traços, os espaços e a quebra de linha. Ele está preso à apresentação, não ao conteúdo. O próprio `src/userService.js` avisa que "o formato do relatório pode mudar no futuro".
- **Risco:** qualquer ajuste de formatação quebra o teste mesmo com o comportamento correto (alarme falso). Com o tempo, a equipe passa a ignorar falhas desse tipo. Além disso, o `toBe(true)` sobre o `startsWith` dá uma mensagem de erro pobre ("expected true, received false").

## 4. `deve falhar ao criar usuário menor de idade` (linhas 66–75)

**Smell:** Exception Handling (falha silenciosa)

```js
try {
  userService.createUser('Menor', 'menor@email.com', 17);
} catch (e) {
  expect(e.message).toBe('O usuário deve ser maior de idade.'); // linha 73
}
```

- **Por que é mau cheiro:** o teste usa `try/catch` para tratar a exceção, e o único `expect` fica dentro do `catch`. Se nenhuma exceção for lançada, o `catch` não roda e o teste termina sem nenhuma verificação.
- **Risco:** se a validação de idade for removida do código, o teste continua verde. É exatamente o tipo de mutante que sobreviveria num teste de mutação (como no trabalho anterior): a regra de negócio some e a suíte não percebe.

## 5. `deve retornar uma lista vazia quando não há usuários` (linhas 77–79)

**Smell:** Ignored Test / Empty Test

```js
test.skip('deve retornar uma lista vazia quando não há usuários', () => {
  // TODO: Implementar este teste depois.
});
```

- **Por que é mau cheiro:** o teste está desativado com `test.skip` e, além disso, não tem corpo nem asserção.
- **Risco:** dá falsa sensação de cobertura, porque o caso aparece na suíte como "skipped" e parece estar previsto. Na prática, o caminho de base vazia de `generateUserReport` ("Nenhum usuário cadastrado.") nunca é exercitado.

## 6. `dadosUsuarioPadrao` e `beforeEach` (linhas 3–16)

**Smell:** General Fixture

```js
const dadosUsuarioPadrao = {
  nome: 'Fulano de Tal',
  email: 'fulano@teste.com',
  idade: 25,
};
```

- **Por que é mau cheiro:** o objeto é global e só o primeiro teste o usa. Os dados ficam longe do teste que depende deles. O `beforeEach` em si é adequado, porque só recria o serviço e limpa a base.
- **Risco:** quem lê o teste precisa subir até o topo do arquivo para entender o cenário. Se outros testes passarem a depender desse objeto, uma mudança nele pode afetar vários testes ao mesmo tempo.

---

## Observação extra sobre o código de produção

Em `createUser`, a validação de campos obrigatórios usa `!idade`. Com isso, `idade = 0` é tratada como "campo ausente" e gera a mensagem "Nome, email e idade são obrigatórios.", e não "O usuário deve ser maior de idade.". Não alterei o `src/` (não fazia parte da atividade), mas evitei usar `0` nos testes de campo obrigatório para não depender desse comportamento.

---

## Comparação com o ESLint

Configuração: ESLint 8.57.1 + `eslint-plugin-jest` 28, com o `.eslintrc.json` do enunciado. A primeira execução está em `docs/eslint-primeira-execucao.txt` (6 problemas: 4 erros e 2 avisos).

| Smell (análise manual) | Detectado pelo ESLint? | Regra / linha |
|---|---|---|
| Conditional Test Logic | Sim | `jest/no-conditional-expect` (linhas 44, 46, 49) |
| Exception Handling | Sim | `jest/no-conditional-expect` (linha 73, `expect` dentro do `catch`) |
| Ignored Test / Empty Test | Sim | `jest/no-disabled-tests` e `jest/expect-expect` (linha 77, avisos) |
| Eager Test | Não | — |
| Assertion Roulette | Não | — |
| Fragile Test / Sensitive Equality | Não | — |
| General Fixture | Não | — |

O linter acerta os smells que têm uma forma sintática reconhecível: um `expect` dentro de `if` ou `catch`, um `test.skip`, um teste sem asserção. Ele aponta o Conditional Test Logic e o Exception Handling pela mesma regra, então a mensagem não diferencia os dois problemas; essa distinção fiz na leitura.

Os outros quatro dependem de entender a intenção do teste: quantos comportamentos ele verifica, se a comparação está presa ao formato, se os dados compartilhados fazem sentido. Isso a análise estática não consegue julgar, e continua exigindo revisão humana.
