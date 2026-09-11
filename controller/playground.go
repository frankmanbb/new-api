package controller

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/types"

	"github.com/gin-gonic/gin"
)

func Playground(c *gin.Context) {
	Relay(c, types.RelayFormatOpenAI)
}

func PlaygroundImage(c *gin.Context) {
	Relay(c, types.RelayFormatOpenAIImage)
}

func PlaygroundTask(c *gin.Context) {
	RelayTask(c)
}

func PlaygroundTaskFetch(c *gin.Context) {
	RelayTaskFetch(c)
}

func PreparePlayground(c *gin.Context) {
	if newAPIError := preparePlaygroundContext(c); newAPIError != nil {
		c.JSON(newAPIError.StatusCode, gin.H{"error": newAPIError.ToOpenAIError()})
		c.Abort()
		return
	}
	c.Next()
}

func preparePlaygroundContext(c *gin.Context) *types.NewAPIError {
	if c.GetBool("use_access_token") {
		return types.NewError(errors.New("暂不支持使用 access token"), types.ErrorCodeAccessDenied, types.ErrOptionWithSkipRetry())
	}
	userId := c.GetInt("id")
	userCache, err := model.GetUserCache(userId)
	if err != nil {
		return types.NewError(err, types.ErrorCodeQueryDataError, types.ErrOptionWithSkipRetry())
	}
	userCache.WriteContext(c)

	usingGroup := common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
	tempToken := &model.Token{
		UserId: userId,
		Name:   fmt.Sprintf("playground-%s", usingGroup),
		Group:  usingGroup,
	}
	if err := middleware.SetupContextForToken(c, tempToken); err != nil {
		return types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
	}
	return nil
}
