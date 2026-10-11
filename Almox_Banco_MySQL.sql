-- =====================================================================
-- ALMOX 3.0 - SCRIPT DE CRIAÇÃO DO BANCO DE DADOS MYSQL
-- Compatível com MySQL >= 8.0.16 (InnoDB, UTF-8 MB4)
-- =====================================================================

-- 1. Criação e seleção do banco de dados principal
CREATE DATABASE IF NOT EXISTS `almox`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `almox`;

-- Opcional: Banco de testes (utilizado pelas rotas de npm run test:integration e test:system)
CREATE DATABASE IF NOT EXISTS `almox_testes`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- =====================================================================
-- 2. TABELA: usuarios
-- Armazena os administradores e funcionários do sistema.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` CHAR(36) NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `cpf` CHAR(11) NULL,
  `telefone` VARCHAR(11) NULL,
  `email` VARCHAR(150) NOT NULL,
  `nascimento` DATE NULL,
  `idade` SMALLINT NULL,
  `cargo` VARCHAR(80) NULL,
  `perfil` ENUM('admin', 'funcionario') NOT NULL DEFAULT 'funcionario',
  `conta_sistema` BOOLEAN NOT NULL DEFAULT 0,
  `senha_hash` VARCHAR(200) NOT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuarios_cpf` (`cpf`),
  UNIQUE KEY `uk_usuarios_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. TABELA: produtos
-- Armazena o catálogo de itens do almoxarifado.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `produtos` (
  `id` CHAR(36) NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `preco` DECIMAL(10,2) NOT NULL,
  `quantidade` INT NOT NULL DEFAULT 0,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_produtos_nome` CHECK (CHAR_LENGTH(`nome`) >= 2 AND CHAR_LENGTH(`nome`) <= 100),
  CONSTRAINT `chk_produtos_preco` CHECK (`preco` > 0 AND `preco` <= 1000000.00),
  CONSTRAINT `chk_produtos_quantidade` CHECK (`quantidade` >= 0 AND `quantidade` <= 1000000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. TABELA: sessoes
-- Controle de autenticação e tokens ativos (com revogação em cascata).
-- =====================================================================
CREATE TABLE IF NOT EXISTS `sessoes` (
  `token_hash` CHAR(64) NOT NULL,
  `usuario_id` CHAR(36) NOT NULL,
  `expira_em` DATETIME NOT NULL,
  PRIMARY KEY (`token_hash`),
  CONSTRAINT `fk_sessoes_usuario` FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. TABELA: movimentacoes
-- Histórico e auditoria de operações de estoque (entradas, saídas, edições, reversões).
-- =====================================================================
CREATE TABLE IF NOT EXISTS `movimentacoes` (
  `sequencia` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` CHAR(36) NOT NULL,
  `alvo_id` CHAR(36) NULL,
  `alvo_nome` VARCHAR(100) NOT NULL,
  `usuario_id` CHAR(36) NULL,
  `usuario_nome` VARCHAR(100) NOT NULL,
  `acao` VARCHAR(50) NOT NULL,
  `antes` JSON NULL,
  `depois` JSON NULL,
  `quantidade` INT NULL,
  `observacao` VARCHAR(200) NOT NULL DEFAULT '',
  `revertido` BOOLEAN NOT NULL DEFAULT 0,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sequencia`),
  UNIQUE KEY `uk_movimentacoes_id` (`id`),
  KEY `idx_movimentacoes_alvo` (`alvo_id`),
  KEY `idx_movimentacoes_usuario` (`usuario_id`),
  CONSTRAINT `fk_movimentacoes_alvo` FOREIGN KEY (`alvo_id`)
    REFERENCES `produtos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movimentacoes_usuario` FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. TABELA: auditoria_admin
-- Histórico de alterações administrativas de usuários/funcionários.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `auditoria_admin` (
  `sequencia` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` CHAR(36) NOT NULL,
  `alvo_id` CHAR(36) NULL,
  `alvo_nome` VARCHAR(100) NOT NULL,
  `usuario_id` CHAR(36) NULL,
  `usuario_nome` VARCHAR(100) NOT NULL,
  `acao` VARCHAR(50) NOT NULL,
  `antes` JSON NULL,
  `depois` JSON NULL,
  `quantidade` INT NULL,
  `observacao` VARCHAR(200) NOT NULL DEFAULT '',
  `revertido` BOOLEAN NOT NULL DEFAULT 0,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sequencia`),
  UNIQUE KEY `uk_auditoria_id` (`id`),
  KEY `idx_auditoria_alvo` (`alvo_id`),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  CONSTRAINT `fk_auditoria_alvo` FOREIGN KEY (`alvo_id`)
    REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. VIEW: produtos_formatados
-- Exibe preços formatados em reais (R$ XX,XX) sem comprometer cálculos numéricos.
-- =====================================================================
CREATE OR REPLACE VIEW `produtos_formatados` AS
SELECT
  `id`,
  `nome`,
  `preco`,
  CONCAT('R$', REPLACE(FORMAT(`preco`, 2, 'pt_BR'), '.', ',')) AS `preco_formatado`,
  `quantidade`
FROM `produtos`;

-- =====================================================================
-- 8. CADASTRO INICIAL DO ADMINISTRADOR DO SISTEMA
-- E-mail: admin@almox.est
-- Senha padrão: #adm321 (hash scrypt com salt aleatório)
-- =====================================================================
INSERT INTO `usuarios` (`id`, `nome`, `email`, `perfil`, `conta_sistema`, `senha_hash`)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Administrador',
  'admin@almox.est',
  'admin',
  1,
  '7c99bea27260031c8e35e84d45650ff6:bac375fabea7efe5325c762a2be35be2e258752d25fbb7630052e2b4ffd317ddb743edc4bcf700e471d40634f8069a3c8b580e376ee5c2616e40e992840f25bc'
)
ON DUPLICATE KEY UPDATE
  `perfil` = 'admin',
  `conta_sistema` = 1;

-- =====================================================================
-- 9. EVENTO: atualizar_idades (Opcional - Requer SET GLOBAL event_scheduler = ON)
-- Executado diariamente às 03:00 UTC (meia-noite de Brasília) para atualizar idades.
-- =====================================================================
DROP EVENT IF EXISTS `atualizar_idades`;
DELIMITER $$
CREATE EVENT `atualizar_idades`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 3 HOUR)
DO
BEGIN
  UPDATE `usuarios`
  SET `idade` = TIMESTAMPDIFF(YEAR, `nascimento`, DATE(UTC_TIMESTAMP() - INTERVAL 3 HOUR))
  WHERE `nascimento` IS NOT NULL
    AND `idade` <> TIMESTAMPDIFF(YEAR, `nascimento`, DATE(UTC_TIMESTAMP() - INTERVAL 3 HOUR));
END$$
DELIMITER ;
