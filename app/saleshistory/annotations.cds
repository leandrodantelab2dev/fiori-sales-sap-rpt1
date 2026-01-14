using SalesService as service from '../../srv/sales-service';

annotate service.SalesHistory with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'date',
                Value: date,
            },
            {
                $Type: 'UI.DataField',
                Label: 'customer',
                Value: customer,
            },
            {
                $Type: 'UI.DataField',
                Label: 'product',
                Value: product,
            },
            {
                $Type: 'UI.DataField',
                Label: 'amount',
                Value: amount,
            },
            {
                $Type: 'UI.DataField',
                Label: 'quantity',
                Value: quantity,
            },
        ],
    },
    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.LineItem                  : [
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Rodar Predição (RPT-1)',
            Action: 'SalesService.runPrediction',
            Inline: false
        },
        {
            $Type: 'UI.DataField',
            Label: 'date',
            Value: date,
        },
        {
            $Type: 'UI.DataField',
            Label: 'customer',
            Value: customer,
        },
        {
            $Type: 'UI.DataField',
            Label: 'product',
            Value: product,
        },
        {
            $Type: 'UI.DataField',
            Label: 'amount',
            Value: amount,
        },
        {
            $Type: 'UI.DataField',
            Label: 'quantity',
            Value: quantity,
        },
    ],
);
