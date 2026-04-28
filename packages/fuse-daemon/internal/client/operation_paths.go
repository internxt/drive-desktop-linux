package client

type OperationPath string

type ErrorResponse struct {
	Errno int32 `json:"errno"`
}

const (
	OperationGetAttr OperationPath = "/op/getattributes"
	OperationOpen    OperationPath = "/op/open"
	OperationOpenDir OperationPath = "/op/opendir"
)

const serverURL = "http://localhost"
