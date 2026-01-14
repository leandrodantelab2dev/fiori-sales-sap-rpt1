using SalesService as service from '../../srv/sales-service';
annotate service.SalesPrediction with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'product',
                Value : product,
            },
            {
                $Type : 'UI.DataField',
                Label : 'region',
                Value : region,
            },
            {
                $Type : 'UI.DataField',
                Label : 'period',
                Value : period,
            },
            {
                $Type : 'UI.DataField',
                Label : 'predictedQuantity',
                Value : predictedQuantity,
            },
            {
                $Type : 'UI.DataField',
                Label : 'predictedRevenue',
                Value : predictedRevenue,
            },
            {
                $Type : 'UI.DataField',
                Label : 'confidence',
                Value : confidence,
            },
            {
                $Type : 'UI.DataField',
                Label : 'model',
                Value : model,
            },
            {
                $Type : 'UI.DataField',
                Label : 'createdAt',
                Value : createdAt,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'product',
            Value : product,
        },
        {
            $Type : 'UI.DataField',
            Label : 'region',
            Value : region,
        },
        {
            $Type : 'UI.DataField',
            Label : 'period',
            Value : period,
        },
        {
            $Type : 'UI.DataField',
            Label : 'predictedQuantity',
            Value : predictedQuantity,
        },
        {
            $Type : 'UI.DataField',
            Label : 'predictedRevenue',
            Value : predictedRevenue,
        },
        {
            $Type : 'UI.DataField',
            Label : 'confidence',
            Value : confidence,
        },
        {
            $Type : 'UI.DataField',
            Label : 'model',
            Value : model,
        },
        {
            $Type : 'UI.DataField',
            Label : 'createdAt',
            Value : createdAt,
        },
    ],
);

