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
	OperationCreate  OperationPath = "/op/create"
	OperationWrite   OperationPath = "/op/write"
	OperationUnlink  OperationPath = "/op/unlink"
	OperationRmdir   OperationPath = "/op/rmdir"
)

const serverURL = "http://localhost"
