package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
	"whattoeat/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Init 初始化数据库连接
func Init() {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "database/whattoeat.db"
	}

	// 确保数据库目录存在
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("创建数据库目录失败: %v", err)
	}

	// 启用 busy_timeout 以防止 SQLite 并发锁表报错，并且启用外键约束
	dsn := fmt.Sprintf("%s?_pragma=foreign_keys(1)&_busy_timeout=5000", dbPath)

	var err error
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// === 连接池优化 ===
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("获取底层数据库实例失败: %v", err)
	}

	// SQLite 设置最大打开连接数为 1 可以避免并发写入锁冲突 (database is locked)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 自动迁移
	err = DB.AutoMigrate(
		&models.User{},
		&models.FridgeItem{},
		&models.UserPreference{},
		&models.SharedMenu{},
		&models.CustomDish{},
	)
	if err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	fmt.Printf("SQLite 数据库连接并开启连接池，路径: %s，自动迁移成功\n", dbPath)
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
