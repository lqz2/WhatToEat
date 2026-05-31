package handlers

import (
	"net/http"
	"whattoeat/database"
	"whattoeat/middleware"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// GetFridgeItems 获取冰箱食材（包括共享的）
func GetFridgeItems(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	var items []models.FridgeItem
	// 查询自己的食材，以及被共享给自己的用户的食材
	db.Where("user_id = ? OR user_id IN (SELECT owner_id FROM shared_menus WHERE shared_with_id = ?)", userID, userID).
		Order("created_at DESC").
		Find(&items)

	c.JSON(http.StatusOK, items)
}

// AddFridgeItem 添加食材
func AddFridgeItem(c *gin.Context) {
	var item models.FridgeItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	item.UserID = userID

	db := database.GetDB()
	if err := db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加失败"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// DeleteFridgeItem 删除食材
func DeleteFridgeItem(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	// 只能删除自己的食材
	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.FridgeItem{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权操作或食材不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
