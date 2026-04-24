package client

type OperationPath string

const (
	OperationGetAttr  OperationPath = "/op/getattributes"
	OperationGetXAttr OperationPath = "/op/getxattr"
)

const serverURL = "http://localhost"
