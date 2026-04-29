package client

type OperationPath string

type ErrorResponse struct {
	Errno int32 `json:"errno"`
}

const (
	OperationGetAttr OperationPath = "/op/getattributes"
	OperationOpen    OperationPath = "/op/open"
	OperationOpenDir OperationPath = "/op/opendir"
	OperationRead    OperationPath = "/op/read"
	OperationRelease OperationPath = "/op/release"
)

const serverURL = "http://localhost"
