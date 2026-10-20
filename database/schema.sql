CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf CHAR(11) NULL UNIQUE,
  telefone VARCHAR(11) NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  nascimento DATE NULL,
  idade SMALLINT NULL,
  cargo VARCHAR(80) NULL,
  pais CHAR(2) NULL,
  estado CHAR(2) NULL,
  cidade VARCHAR(100) NULL,
  bairro VARCHAR(100) NULL,
  perfil ENUM('admin','funcionario') NOT NULL DEFAULT 'funcionario',
  conta_sistema BOOLEAN NOT NULL DEFAULT 0,
  senha_hash VARCHAR(200) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS produtos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_produto_nome CHECK (CHAR_LENGTH(nome) >= 2 AND CHAR_LENGTH(nome) <= 100),
  CONSTRAINT chk_produto_preco CHECK (preco > 0 AND preco <= 1000000.00),
  CONSTRAINT chk_produto_qtd CHECK (quantidade >= 0 AND quantidade <= 1000000)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  expira_em DATETIME NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimentacoes (
  sequencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id CHAR(36) NOT NULL UNIQUE,
  alvo_id CHAR(36) NULL,
  alvo_nome VARCHAR(100) NOT NULL,
  alvo_ref CHAR(36) NULL,
  usuario_id CHAR(36) NULL,
  usuario_nome VARCHAR(100) NOT NULL,
  usuario_email VARCHAR(150) NULL,
  acao VARCHAR(50) NOT NULL,
  antes JSON NULL,
  depois JSON NULL,
  quantidade INT NULL,
  observacao VARCHAR(200) NOT NULL DEFAULT '',
  revertido BOOLEAN NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alvo_id) REFERENCES produtos(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditoria_admin (
  sequencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id CHAR(36) NOT NULL UNIQUE,
  alvo_id CHAR(36) NULL,
  alvo_nome VARCHAR(100) NOT NULL,
  alvo_ref CHAR(36) NULL,
  usuario_id CHAR(36) NULL,
  usuario_nome VARCHAR(100) NOT NULL,
  usuario_email VARCHAR(150) NULL,
  acao VARCHAR(50) NOT NULL,
  antes JSON NULL,
  depois JSON NULL,
  quantidade INT NULL,
  observacao VARCHAR(200) NOT NULL DEFAULT '',
  revertido BOOLEAN NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alvo_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW produtos_formatados AS
SELECT id, nome, preco, CONCAT('R$', FORMAT(preco, 2, 'de_DE')) AS preco_formatado, quantidade
FROM produtos;

