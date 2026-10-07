const { UserService } = require('../src/userService');

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
    userService._clearDB();
  });

  describe('createUser', () => {
    test('retorna um usuário com id gerado quando os dados são válidos', () => {
      // Arrange
      const nome = 'Fulano de Tal';
      const email = 'fulano@teste.com';
      const idade = 25;

      // Act
      const usuario = userService.createUser(nome, email, idade);

      // Assert
      expect(usuario.id).toEqual(expect.any(String));
      expect(usuario.id).not.toBe('');
    });

    test('preserva o nome, o email e a idade informados', () => {
      // Arrange
      const dados = { nome: 'Fulano de Tal', email: 'fulano@teste.com', idade: 25 };

      // Act
      const usuario = userService.createUser(dados.nome, dados.email, dados.idade);

      // Assert
      expect(usuario).toMatchObject(dados);
    });

    test('cria o usuário com status "ativo" por padrão', () => {
      // Arrange
      const nome = 'Fulano de Tal';
      const email = 'fulano@teste.com';
      const idade = 25;

      // Act
      const usuario = userService.createUser(nome, email, idade);

      // Assert
      expect(usuario.status).toBe('ativo');
    });

    test('cria o usuário sem privilégio de administrador por padrão', () => {
      // Arrange
      const nome = 'Fulano de Tal';
      const email = 'fulano@teste.com';
      const idade = 25;

      // Act
      const usuario = userService.createUser(nome, email, idade);

      // Assert
      expect(usuario.isAdmin).toBe(false);
    });

    test('registra a data de criação do usuário', () => {
      // Arrange
      const nome = 'Fulano de Tal';
      const email = 'fulano@teste.com';
      const idade = 25;

      // Act
      const usuario = userService.createUser(nome, email, idade);

      // Assert
      expect(usuario.createdAt).toEqual(expect.any(Date));
    });

    test('gera ids diferentes para usuários distintos', () => {
      // Arrange
      const primeiro = userService.createUser('Alice', 'alice@teste.com', 28);

      // Act
      const segundo = userService.createUser('Bob', 'bob@teste.com', 32);

      // Assert
      expect(segundo.id).not.toBe(primeiro.id);
    });

    test('permite criar um usuário com exatamente 18 anos', () => {
      // Arrange
      const idadeMinima = 18;

      // Act
      const acao = () => userService.createUser('Jovem', 'jovem@teste.com', idadeMinima);

      // Assert
      expect(acao).not.toThrow();
    });

    test('lança erro quando o usuário é menor de idade', () => {
      // Arrange
      const idadeMenor = 17;

      // Act
      const acao = () => userService.createUser('Menor', 'menor@teste.com', idadeMenor);

      // Assert
      expect(acao).toThrow('O usuário deve ser maior de idade.');
    });

    test.each([
      { campo: 'nome', args: [undefined, 'ana@teste.com', 25] },
      { campo: 'email', args: ['Ana', undefined, 25] },
      { campo: 'idade', args: ['Ana', 'ana@teste.com', undefined] },
    ])('lança erro quando o campo $campo não é informado', ({ args }) => {
      // Arrange: dados vindos da tabela do test.each

      // Act
      const acao = () => userService.createUser(...args);

      // Assert
      expect(acao).toThrow('Nome, email e idade são obrigatórios.');
    });
  });

  describe('getUserById', () => {
    test('retorna o usuário correspondente ao id buscado', () => {
      // Arrange
      userService.createUser('Alice', 'alice@teste.com', 28);
      const bob = userService.createUser('Bob', 'bob@teste.com', 32);

      // Act
      const encontrado = userService.getUserById(bob.id);

      // Assert
      expect(encontrado).toEqual(bob);
    });

    test('retorna null quando o id não existe', () => {
      // Arrange
      userService.createUser('Alice', 'alice@teste.com', 28);
      const idInexistente = 'id-inexistente';

      // Act
      const encontrado = userService.getUserById(idInexistente);

      // Assert
      expect(encontrado).toBeNull();
    });
  });

  describe('deactivateUser', () => {
    test('retorna true ao desativar um usuário comum', () => {
      // Arrange
      const comum = userService.createUser('Comum', 'comum@teste.com', 30);

      // Act
      const resultado = userService.deactivateUser(comum.id);

      // Assert
      expect(resultado).toBe(true);
    });

    test('altera o status do usuário comum para "inativo"', () => {
      // Arrange
      const comum = userService.createUser('Comum', 'comum@teste.com', 30);

      // Act
      userService.deactivateUser(comum.id);

      // Assert
      expect(userService.getUserById(comum.id).status).toBe('inativo');
    });

    test('retorna false ao tentar desativar um administrador', () => {
      // Arrange
      const admin = userService.createUser('Admin', 'admin@teste.com', 40, true);

      // Act
      const resultado = userService.deactivateUser(admin.id);

      // Assert
      expect(resultado).toBe(false);
    });

    test('mantém o administrador com status "ativo" após a tentativa de desativação', () => {
      // Arrange
      const admin = userService.createUser('Admin', 'admin@teste.com', 40, true);

      // Act
      userService.deactivateUser(admin.id);

      // Assert
      expect(userService.getUserById(admin.id).status).toBe('ativo');
    });

    test('retorna false quando o id não existe', () => {
      // Arrange
      userService.createUser('Comum', 'comum@teste.com', 30);
      const idInexistente = 'id-inexistente';

      // Act
      const resultado = userService.deactivateUser(idInexistente);

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('generateUserReport', () => {
    test('inclui o título do relatório', () => {
      // Arrange
      userService.createUser('Alice', 'alice@teste.com', 28);

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain('Relatório de Usuários');
    });

    test('lista o id e o nome de cada usuário cadastrado', () => {
      // Arrange
      const alice = userService.createUser('Alice', 'alice@teste.com', 28);
      const bob = userService.createUser('Bob', 'bob@teste.com', 32);

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain(alice.id);
      expect(relatorio).toContain('Alice');
      expect(relatorio).toContain(bob.id);
      expect(relatorio).toContain('Bob');
      expect(relatorio).not.toContain('Nenhum usuário cadastrado');
    });

    test('exibe o status atual do usuário', () => {
      // Arrange
      const usuario = userService.createUser('Alice', 'alice@teste.com', 28);
      userService.deactivateUser(usuario.id);

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain('inativo');
    });

    test('informa que não há usuários quando a base está vazia', () => {
      // Arrange: base vazia (limpa no beforeEach)

      // Act
      const relatorio = userService.generateUserReport();

      // Assert
      expect(relatorio).toContain('Nenhum usuário cadastrado');
    });
  });
});
