package client

type OperationPath string

const (
	OperationGetAttr OperationPath = "/op/getattributes"
	OperationOpen    OperationPath = "/op/open"
	OperationOpenDir OperationPath = "/op/opendir"
)

const serverURL = "http://localhost"
